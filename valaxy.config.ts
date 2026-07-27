import type { UserThemeConfig } from 'valaxy-theme-yun'
import { defineValaxyConfig } from 'valaxy'

const safelist = [
  'i-ri-home-line',
]

export default defineValaxyConfig<UserThemeConfig>({
  theme: 'yun',

  themeConfig: {
    banner: {
      enable: true,
      title: "fjy33 的小站",
    },

    footer: {
      since: 2026,
    },
  },

  unocss: { safelist },
})