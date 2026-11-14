// 링크 공유 미리보기 이미지(public/og.png, 1200x630)를 만든다. 사용법: node scripts/make-og.mjs
// 색은 KRDS 토큰(primary-50 #256ef4, gray-90 #1e2124, gray-70 #464c53).
import sharp from 'sharp';

const font = "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
	<rect width="1200" height="630" fill="#ffffff"/>
	<rect width="24" height="630" fill="#256ef4"/>
	<text x="96" y="290" font-family="${font}" font-size="80" font-weight="700" fill="#1e2124">일본 정착 기초 가이드</text>
	<text x="96" y="380" font-family="${font}" font-size="40" fill="#464c53">입국 전부터 첫 1년까지, 시기별 할 일과 마감일</text>
	<text x="96" y="540" font-family="${font}" font-size="28" fill="#256ef4">공식 출처 기반 · 회원가입 없음</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('public/og.png 생성');
