// 체크리스트 진행 상황을 localStorage에 저장/복원하고 진행률 막대를 갱신한다.
// 저장 형식: { "<task id>": true, ... }  — 키는 tasks 폴더의 파일 이름.

const STORAGE_KEY = 'jsg:progress:v1';

type Progress = Record<string, boolean>;

function load(): Progress {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Progress) : {};
	} catch {
		// 시크릿 모드 등에서 저장소를 쓸 수 없어도 페이지는 정상 동작해야 한다.
		return {};
	}
}

function save(progress: Progress) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
	} catch {
		/* 저장 실패는 무시 (이번 방문 동안만 유지) */
	}
}

let progress: Progress = {};

function render() {
	document.querySelectorAll<HTMLInputElement>('input[data-task-id]').forEach((input) => {
		const done = Boolean(progress[input.dataset.taskId!]);
		input.checked = done;
		input.closest('[data-task-card]')?.classList.toggle('is-done', done);
	});

	document.querySelectorAll<HTMLElement>('[data-progress]').forEach((el) => {
		const ids = (el.dataset.progress ?? '').split(',').filter(Boolean);
		const done = ids.filter((id) => progress[id]).length;
		const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
		const doneEl = el.querySelector('[data-progress-done]');
		if (doneEl) doneEl.textContent = String(done);
		el.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', String(done));
		el.querySelector<HTMLElement>('.progress-fill')?.style.setProperty('width', `${pct}%`);
		el.classList.toggle('is-complete', ids.length > 0 && done === ids.length);
	});
}

let initialized = false;

export function initChecklist() {
	if (initialized) return;
	initialized = true;
	progress = load();
	render();

	document.addEventListener('change', (e) => {
		const input = e.target as HTMLInputElement;
		if (!input.matches?.('input[data-task-id]')) return;
		const id = input.dataset.taskId!;
		if (input.checked) progress[id] = true;
		else delete progress[id];
		save(progress);
		render();
	});

	document.addEventListener('click', (e) => {
		const btn = (e.target as HTMLElement).closest('[data-progress-reset]');
		if (!btn) return;
		if (!confirm('모든 체크 표시를 지울까요? 되돌릴 수 없습니다.')) return;
		progress = {};
		save(progress);
		render();
	});

	// 다른 탭에서 체크한 내용도 반영
	window.addEventListener('storage', (e) => {
		if (e.key !== STORAGE_KEY) return;
		progress = load();
		render();
	});
}
