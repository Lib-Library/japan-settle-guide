// 초기비용 계산 검사. 사용법: npm run check
import assert from 'node:assert/strict';
import { calcCost, defaultMoveIn, EXTRAS, PRESETS } from '../src/lib/initial-cost.ts';

const input = (preset, over = {}) => ({
	rent: 85000,
	mgmt: 5000,
	shiki: preset.shiki,
	rei: preset.rei,
	fee: preset.fee,
	guar: preset.guar,
	next: preset.next,
	date: '2026-04-16',
	extras: EXTRAS.map((x) => ({ ...x, on: preset.extras.includes(x.id) })),
	...over,
});
const amount = (r, label) => r.items.find((it) => it.label === label)?.amount;

const std = calcCost(input(PRESETS.std));
assert.equal(std.total, 478000);
assert.equal(std.keep, 85000);
assert.equal(std.gone, 393000);
assert.equal(amount(std, '4월 일할 집세'), 45000);
assert.equal(amount(std, '5월 집세'), 90000);

// UR: 시키킨 + 일할 집세만
const ur = calcCost(input(PRESETS.ur));
assert.equal(ur.total, 170000 + 45000);

// 12월 입주의 다음 달은 1월
assert.ok(amount(calcCost(input(PRESETS.std, { date: '2026-12-01' })), '1월 집세'));
// 윤년 2월
assert.equal(amount(calcCost(input(PRESETS.std, { date: '2028-02-29' })), '2월 일할 집세'), Math.floor(90000 / 29));
// 소수 곱셈 오차로 1엔 모자라면 안 된다
for (let rent = 10000; rent <= 300000; rent += 100) {
	const r = calcCost(input(PRESETS.std, { rent, mgmt: 0, fee: 0.55 }));
	assert.equal(amount(r, '중개수수료'), (rent * 55) / 100 - (((rent * 55) % 100) / 100));
}
// 빈 입력에서도 깨지지 않는다
const empty = calcCost(input(PRESETS.std, { rent: 0, mgmt: 0, date: '' }));
assert.equal(empty.months, 0);
assert.ok(Number.isFinite(empty.total));

assert.equal(defaultMoveIn(new Date(2026, 11, 31)), '2027-01-15');
assert.equal(defaultMoveIn(new Date(2026, 0, 31)), '2026-02-15');
console.log('초기비용 계산 검사 통과');
