---
title: 多格式文件处理方案设计
date: 2026-07-27
tags:
  - 技术方案
  - Docker
  - OCR
  - MinerU
---

![流程图](/多格式文件转md方案/流程图.png)

## 一、总体设计流程

系统采用 **Master-Worker 拓扑结构**，基于 Docker Compose 实现容器化一键部署。

### 组件架构

| 组件类型 | 服务名称 | 实例数 | 核心职责 |
|---------|---------|--------|---------|
| 调度处理 | file_to_md | 1 | 接收外部 API 请求、文件 I/O 管理、处理简单文本文件、负载均衡策略分发任务 |
| 图片PDF解析 | mineru1~5 | 5 | 执行实际的 OCR 识别、版面分析及 Markdown 转换 |
| 网络层 | app-network | 1 | 桥接模式，实现服务间内部通信隔离 |

## 二、核心模块详细设计

### 2.1 调度处理模块

基于 Python FastAPI，接收外部请求，处理挂载卷中的文件。

#### 文件分类

识别文件类型、选择合适的解析引擎并生成 Markdown。

#### 文件处理

- 针对 `.doc`、`.xls` 格式数据文件，使用 **LibreOffice** 进行预处理，将 `.doc` 和 `.xls` 文件转为 `.docx` 和 `.xlsx` 文件
- 针对 `.docx` 和 `.pptx` 格式数据文件，使用 **markitdown** 将 `.docx` 文件转为 markdown 文本
- 针对 `.mht` 文件将其转为 markdown 文本
- 定位 markdown 文本中的 base64 字符串编码，将其还原成图片。调用 MinerU 本地文字检测与识别模型，将图片转为 markdown 文本，并替换掉原位置的 base64 字符串编码，最终输出 markdown 格式的纯文本文件
- 使用线程池实现文件并行处理

#### 任务分配

使用**最少活跃连接数**负载均衡策略将 pdf 文件和图片文件将任务分配给 MinerU 解析模块。

### 2.2 图片PDF解析模块

#### 1、图片PDF识别

基于 MinerU 本地模型，采用 pipeline 的方式，使用 cpu 处理图片和 PDF 文件。将其转为 markdown 形式。

#### 2、定时清理任务

为避免输出目录无限膨胀，网关容器内集成了 cron 服务，通过 `docker-entrypoint.sh` 启动。`clean_output.sh` 脚本定期（如每周日凌晨）清空 `/app/output` 目录，仅保留目录本身。

## 三、调用示例

```bash
curl -X POST http://localhost:8005/convert \
  -H "Content-Type: application/json" \
  -d '{
    "input": "/data/input",
    "output_dir": "/data/output"
  }'
```

## 四、代码说明

### 4.1 file_to_md 镜像

更改 `process_one_file` 函数可以调整不同类型文件的处理逻辑。

### 4.2 MinerU 镜像

如果想以 cpu 运行 MinerU，安装依赖时先安装 CPU 版 PyTorch，再安装 MinerU 核心及依赖，最后下载模型。安装命令如下：

```bash
# 1. 升级 pip
python -m pip install --upgrade pip

# 2. 安装 CPU 版 PyTorch
# 使用 --index-url 指定 CPU 版本的 PyTorch 源
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 3. 安装 mineru[core]
# 指定 --extra-index-url 确保 PyTorch 相关依赖保持 CPU 版本
pip install "mineru[core]" --extra-index-url https://download.pytorch.org/whl/cpu -i https://mirrors.aliyun.com/pypi/simple

# 4. 从 ModelScope 下载mineru模型
mineru-models-download -s modelscope -m pipeline

# 5. 启动 API 服务，监听所有地址的 8000 端口
mineru-api --host 0.0.0.0 --port 8000 --device cpu
```

以 cpu 运行 MinerU 时只能使用 pipeline 模式：

```bash
curl -X POST http://localhost:8000/file_parse \
  -F "files=@/path/to/your/file.pdf" \
  -F "return_md=true" \
  -F "backend=pipeline"
```

## 五、缺陷说明

### 5.1 file_to_md

- `batch_convert_files` 函数使用线程池，且解压过程中 `process_archive` 递归调用 `batch_convert_files`，如果 `process_archive` 中 `max_workers` 参数设置过大且文件中压缩包过多会造成线程数爆炸
- `.doc` 和 `.xls` 文件转换为 `.docx` 和 `.xlsx` 文件时，依赖 Libreoffice，但 Libreoffice 无法并行处理文件。现阶段采用线程锁强制单次只处理一个文件
- 提取 word 中附件时存在有些附件无法提取的情况

### 5.2 mineru

MinerU 本地模型处理图片和 pdf 后会在本地 output 文件夹留下图片和转换后的 markdown 文件，如果处理文件数过多或者运行时间很长会占用系统大量磁盘空间，一次处理大概产生 600KB 数据，镜像使用 `clean_output.sh` 脚本定期（如每周日凌晨）清空 `/app/output` 目录，仅保留目录本身。

## 六、负载占用

| MinerU数量 | 线程并发数 | CPU占用(16核) | 内存占用 |
|-----------|-----------|--------------|---------|
| 2 | 10 | 75% | 7-14G |
| 3 | 10 | 90% | 14-20g |
| 5 | 10 | 98% | 27G-34G |

**建议：** 1个 MinerU 实例分配 7G 内存以上，使用华为鲲鹏 920（HiSilicon Kunpeng 920）cpu，16核使用 3 个 MinerU 实例。