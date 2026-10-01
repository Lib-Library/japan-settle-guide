// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkVerify from './src/plugins/remark-verify.mjs';

// https://astro.build/config
export default defineConfig({
	markdown: {
		// 본문의 [확인 필요]를 배지로 바꾸는 remark 플러그인을 쓰기 위해 unified 처리기를 사용한다.
		processor: unified({ remarkPlugins: [remarkVerify] }),
	},
	integrations: [
		starlight({
			title: '일본 정착 기초 가이드',
			description: '일본 기업에 입사한 한국인을 위한 입국 전부터 첫 1년까지의 정착 체크리스트',
			// 한국어가 기본(루트 경로). 일본어 버전은 src/content/docs/ja/ 에 파일을 추가하고
			// 아래 ja 항목의 주석을 풀면 된다. 번역이 없는 페이지는 한국어로 표시된다.
			defaultLocale: 'root',
			locales: {
				root: { label: '한국어', lang: 'ko' },
				// ja: { label: '日本語', lang: 'ja' },
			},
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
					},
				},
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
					},
				},
			],
			customCss: ['./src/styles/custom.css'],
			components: {
				PageTitle: './src/components/overrides/PageTitle.astro',
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
			},
			sidebar: [
				{ label: '홈', link: '/' },
				{
					label: '시간순 체크리스트',
					items: [
						{ label: '① 입국 전', slug: 'timeline/pre-arrival' },
						{ label: '② 입국 후 2주 이내', slug: 'timeline/arrival-2w' },
						{ label: '③ 첫 3개월', slug: 'timeline/first-3m' },
						{ label: '④ 첫 1년', slug: 'timeline/first-1y' },
					],
				},
				{
					label: '주제별 가이드',
					items: [{ autogenerate: { directory: 'topics' } }],
				},
				{ label: '이 사이트에 대해', slug: 'about' },
			],
		}),
	],
});
