import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://fjy20021006.github.io/',
  lang: 'zh-CN',
  title: 'fjy\'s Blog',

  author: {
    name: 'fjy',
    avatar: '/主页图片/头像.bmp',

    status: {
      emoji: '',
      message: '',
    },
  },

  description: '',

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
    enable: true,
  },

  sponsor: {
    enable: false,
  },

  mode: 'dark',

  comment: {
    enable: true,
  },

  subtitle: 'enjoy life',

  excerpt: {
    auto: false,
  },
})