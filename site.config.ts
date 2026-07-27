import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://fjy20021006.github.io/',
  lang: 'zh-CN',
  title: "FJY's Blog",
  author: {
    name: 'fjy33',
  },
  description: 'fjy33 的个人博客',
  social: [
    {
      name: 'RSS',
      link: '/atom.xml',
      icon: 'i-ri-rss-line',
      color: 'orange',
    },
    {
      name: 'GitHub',
      link: 'https://github.com/fjy20021006',
      icon: 'i-ri-github-line',
      color: '#6e5494',
    },
  ],

  search: {
    enable: false,
  },

  sponsor: {
    enable: false,
  },
})