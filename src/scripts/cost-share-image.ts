// 초기비용 결과를 공유용 PNG로 그린다. 다크 모드와 상관없이 항상 밝은 카드로 만든다.
export interface ShareCard {
	total: string;
	sub: string[];
	keep: string;
	gone: string;
	keepRatio: number;
	items: { label: string; amount: string }[];
	footer: string[];
}

// 폰 화면 폭에서도 글자가 작아지지 않도록 좁게 그리고 해상도를 올린다.
const WIDTH = 400;
const PAD = 24;
const SCALE = 3;
const FONT = `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;

export async function drawShareCard(card: ShareCard): Promise<Blob> {
	const css = getComputedStyle(document.documentElement);
	const token = (name: string) => css.getPropertyValue(`--krds-color-light-${name}`).trim();
	const ink = token('gray-90');
	const muted = token('gray-60');
	const line = token('gray-20');
	const keepColor = token('success-60');
	const goneColor = token('danger-60');

	// 글꼴은 글자 범위별로 내려받으므로 그릴 글자를 알려 준다. CDN이 느려도 시스템 글꼴로 넘어간다.
	const text = [card.total, ...card.sub, card.keep, card.gone, ...card.footer, ...card.items.flatMap((i) => [i.label, i.amount]), '일본 집 초기비용 예상나중에 돌려받을 수 있음돌려받지 못함'].join('');
	await Promise.race([
		Promise.all([document.fonts.load(`400 16px ${FONT}`, text), document.fonts.load(`700 16px ${FONT}`, text)]).catch(() => {}),
		new Promise((done) => setTimeout(done, 1500)),
	]);

	const rowH = 34;
	const height = PAD + 30 + 62 + card.sub.length * 24 + 28 + 52 + card.items.length * rowH + 22 * card.footer.length + 18 + PAD;
	const canvas = document.createElement('canvas');
	canvas.width = WIDTH * SCALE;
	canvas.height = height * SCALE;
	const g = canvas.getContext('2d')!;
	g.scale(SCALE, SCALE);
	g.fillStyle = token('gray-0');
	g.fillRect(0, 0, WIDTH, height);

	const put = (s: string, x: number, y: number, size: number, color: string, weight = 400, align: CanvasTextAlign = 'left') => {
		g.font = `${weight} ${size}px ${FONT}`;
		g.fillStyle = color;
		g.textAlign = align;
		g.fillText(s, x, y);
	};
	const right = WIDTH - PAD;
	const inner = right - PAD;

	let y = PAD + 16;
	put('일본 집 초기비용 예상', PAD, y, 18, ink, 700);
	y += 62;
	put(card.total, PAD, y, 46, ink, 700);
	y += 6;
	for (const line of card.sub) {
		y += 24;
		put(line, PAD, y, 15, muted);
	}
	y += 22;

	const keepW = inner * card.keepRatio;
	g.fillStyle = line;
	g.fillRect(PAD, y, inner, 8);
	g.fillStyle = keepColor;
	g.fillRect(PAD, y, keepW, 8);
	g.fillStyle = goneColor;
	g.fillRect(PAD + keepW, y, inner - keepW, 8);
	y += 32;
	put('나중에 돌려받을 수 있음', PAD, y, 14, keepColor, 700);
	put(card.keep, right, y, 14, ink, 700, 'right');
	y += 24;
	put('돌려받지 못함', PAD, y, 14, goneColor, 700);
	put(card.gone, right, y, 14, ink, 700, 'right');
	y += 14;

	for (const item of card.items) {
		g.fillStyle = line;
		g.fillRect(PAD, y, inner, 1);
		y += rowH;
		put(item.label, PAD, y - 11, 15, ink);
		put(item.amount, right, y - 11, 15, ink, 400, 'right');
	}
	g.fillStyle = ink;
	g.fillRect(PAD, y, inner, 2);
	y += 8;
	for (const line of card.footer) {
		y += 22;
		put(line, PAD, y, 13, muted);
	}

	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG 생성 실패'))), 'image/png');
	});
}
