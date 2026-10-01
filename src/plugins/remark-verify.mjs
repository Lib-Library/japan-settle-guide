// 본문에 쓴 "[확인 필요]"를 눈에 띄는 배지로 바꿔 준다.
import { visit, SKIP } from 'unist-util-visit';

export const VERIFY_MARK = '[확인 필요]';
// html 노드 대신 hName을 쓰면 .md와 .mdx 모두에서 동작한다.
const badge = () => ({
	type: 'verifyBadge',
	data: {
		hName: 'span',
		hProperties: { className: ['verify-badge'], title: '공식 출처로 아직 확인하지 못한 내용입니다' },
	},
	children: [{ type: 'text', value: '확인 필요' }],
});

export default function remarkVerify() {
	return (tree) => {
		visit(tree, 'text', (node, index, parent) => {
			if (!parent || index === undefined || !node.value.includes(VERIFY_MARK)) return;
			const parts = node.value.split(VERIFY_MARK);
			const nodes = [];
			parts.forEach((part, i) => {
				if (part) nodes.push({ type: 'text', value: part });
				if (i < parts.length - 1) nodes.push(badge());
			});
			parent.children.splice(index, 1, ...nodes);
			return [SKIP, index + nodes.length];
		});
	};
}
