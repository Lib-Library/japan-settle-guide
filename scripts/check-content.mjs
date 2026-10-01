// 콘텐츠 점검 리포트: [확인 필요] 위치, 오래된 확인일, 출처 없는 주제 페이지를 출력한다.
// 사용법: npm run check
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/content/', import.meta.url).pathname;
const MARK = '[확인 필요]';
const STALE_DAYS = 183; // src/lib/taxonomy.ts의 STALE_AFTER_DAYS와 같게 유지

async function* walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(path);
		else if (/\.mdx?$/.test(entry.name)) yield path;
	}
}

const verify = [];
const stale = [];
const noSources = [];
const now = Date.now();

for await (const file of walk(ROOT)) {
	const rel = relative(ROOT, file);
	const text = await readFile(file, 'utf8');

	text.split('\n').forEach((line, i) => {
		if (line.includes(MARK)) verify.push(`${rel}:${i + 1}  ${line.trim()}`);
	});

	const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
	const date = fm.match(/^lastVerified:\s*(\S+)/m)?.[1];
	if (date) {
		const days = Math.floor((now - new Date(date).getTime()) / 86_400_000);
		if (days > STALE_DAYS) stale.push(`${rel}  (${date}, ${days}일 전)`);
	}
	if (rel.startsWith('docs/topics/') && !/^sources:/m.test(fm)) noSources.push(rel);
}

const section = (title, items) => {
	console.log(`\n■ ${title}: ${items.length}건`);
	items.forEach((x) => console.log(`  - ${x}`));
};

console.log('콘텐츠 점검 리포트');
section('[확인 필요] 표시', verify);
section(`확인일이 ${STALE_DAYS}일 넘게 지난 파일`, stale);
section('출처(sources)가 없는 주제 페이지', noSources);
console.log('\n※ 할 일(tasks) 파일의 출처 누락·형식 오류는 npm run build 단계에서 오류로 잡힙니다.');
