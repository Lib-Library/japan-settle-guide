import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { PHASE_IDS, TOPIC_IDS } from './lib/taxonomy';

// 공식 출처 링크. label은 "기관명 – 페이지 제목" 형식으로 쓴다.
const source = z.object({
	label: z.string().min(1),
	url: z.url(),
});

// 입국일로 마감일을 계산하기 위한 값. 공식 출처의 기한 문장(deadline)에 있는 숫자만 쓴다.
const due = z.union([
	z.object({
		kind: z.enum(['arrival', 'estimate']),
		days: z.number().int().optional(),
		months: z.number().int().optional(),
	}),
	z
		.object({
			kind: z.literal('yearly'),
			yearOffset: z.number().int().min(0),
			month: z.number().int().min(1).max(12),
			day: z.number().int().min(1).max(31),
		})
		// 그달에 없는 날(2월 30일 등)은 다음 달로 넘어가 버리므로 막는다. 2월은 윤년 기준 29일까지.
		.refine((d) => d.day <= new Date(Date.UTC(2024, d.month, 0)).getUTCDate(), {
			message: '그달에 없는 날짜입니다.',
		}),
	// 시기별 권장 날짜를 붙이면 오해를 부르는 항목 (회사가 정하는 기한, 바뀔 때마다 하는 일)
	z.object({ kind: z.literal('none') }),
]);

export const collections = {
	// 일반 페이지 (홈, 시간순, 주제별, 용어집 등)
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// 마지막으로 공식 출처와 대조한 날짜 (모든 페이지 필수)
				lastVerified: z.coerce.date(),
				// true면 "전문가/관할 기관 확인" 안내를 페이지 상단에 표시
				needsExpert: z.boolean().default(false),
				// 페이지 하단에 자동으로 표시되는 출처 목록
				sources: z.array(source).default([]),
			}),
		}),
	}),

	// 체크리스트 항목. 파일 이름이 진행 상황 저장 키가 되므로 한 번 정하면 바꾸지 않는다.
	tasks: defineCollection({
		loader: glob({ pattern: '**/*.md', base: './src/content/tasks' }),
		schema: z.object({
			title: z.string(),
			term: z.object({ ja: z.string(), reading: z.string() }).optional(),
			phase: z.enum(PHASE_IDS),
			topic: z.enum(TOPIC_IDS),
			order: z.number().default(100),
			optional: z.boolean().default(false),
			where: z.string(),
			deadline: z.string(),
			due: due.optional(),
			bring: z.array(z.string()).default([]),
			sources: z.array(source).min(1, '공식 출처를 최소 1개 이상 적어야 합니다.'),
			lastVerified: z.coerce.date(),
			needsExpert: z.boolean().default(false),
		}),
	}),
};
