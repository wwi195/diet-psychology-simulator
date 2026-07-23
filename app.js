'use strict';

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// このセッション内だけ保持する直近の記録（過去ログを特定する仕組みは持たない）
let lastLog = null; // { id, actionType }

// ===== タブ切り替え =====
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    tabButtons.forEach((b) => b.classList.remove('active'));
    tabPanels.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'ranking') {
      loadRanking();
    }
    if (btn.dataset.tab === 'detail') {
      showDetailTab();
    }
  });
});

function switchToTab(tabName) {
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).click();
}

// ===== 記録フォーム（クイック） =====
let selectedActionType = null;
let selectedRegret = null;

const actionButtons = document.querySelectorAll('#action-type-group .choice-btn');
const regretButtons = document.querySelectorAll('#regret-group .choice-btn');
const submitBtn = document.getElementById('submit-btn');
const formMessage = document.getElementById('form-message');
const form = document.getElementById('log-form');
const detailInvite = document.getElementById('detail-invite');
const detailInviteBtn = document.getElementById('detail-invite-btn');
const detailTabBtn = document.getElementById('detail-tab-btn');

function updateSubmitState() {
  submitBtn.disabled = !(selectedActionType && selectedRegret !== null);
}

actionButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    actionButtons.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedActionType = btn.dataset.value;
    updateSubmitState();
  });
});

regretButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    regretButtons.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedRegret = btn.dataset.value === 'true';
    updateSubmitState();
  });
});

function resetForm() {
  actionButtons.forEach((b) => b.classList.remove('selected'));
  regretButtons.forEach((b) => b.classList.remove('selected'));
  selectedActionType = null;
  selectedRegret = null;
  updateSubmitState();
}

detailInviteBtn.addEventListener('click', () => {
  switchToTab('detail');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  formMessage.textContent = '';
  formMessage.className = 'form-message';
  detailInvite.classList.add('hidden');

  const { data, error } = await sbClient
    .from('logs')
    .insert({ action_type: selectedActionType, regret: selectedRegret })
    .select('id')
    .single();

  if (error) {
    formMessage.textContent = '記録に失敗しました。時間を置いて試してください。';
    formMessage.className = 'form-message error';
    submitBtn.disabled = false;
    return;
  }

  formMessage.textContent = '記録しました！';
  formMessage.className = 'form-message success';

  lastLog = { id: data.id, actionType: selectedActionType };
  detailTabBtn.disabled = false;
  detailInvite.classList.remove('hidden');
  resetDetailPanel();

  resetForm();
});

// ===== ランキング表示 =====
const rankingList = document.getElementById('ranking-list');

async function loadRanking() {
  rankingList.innerHTML = '<p class="ranking-empty">読み込み中...</p>';

  const { data, error } = await sbClient.from('logs').select('action_type, regret');

  if (error) {
    rankingList.innerHTML = '<p class="ranking-empty">読み込みに失敗しました</p>';
    return;
  }

  if (!data || data.length === 0) {
    rankingList.innerHTML = '<p class="ranking-empty">まだ記録がありません</p>';
    return;
  }

  const ranked = computeRanking(data);

  rankingList.innerHTML = ranked.map((item, i) => `
    <div class="ranking-item">
      <div class="ranking-rank">${i + 1}位</div>
      <div class="ranking-body">
        <div class="ranking-name">${item.actionType}</div>
        <div class="ranking-bar-track">
          <div class="ranking-bar-fill" style="width: ${Math.round(item.rate * 100)}%"></div>
        </div>
        <div class="ranking-percent">${Math.round(item.rate * 100)}% <span class="ranking-count">(n=${item.total})</span></div>
      </div>
    </div>
  `).join('');
}

// ===== もっと詳しく分析タブ =====
const detailEmpty = document.getElementById('detail-empty');
const detailForm = document.getElementById('detail-form');
const detailResult = document.getElementById('detail-result');
const detailMessage = document.getElementById('detail-message');
const detailSubmitBtn = document.getElementById('detail-submit-btn');
const triggerGroup = document.getElementById('trigger-group');
const moodGroup = document.getElementById('mood-group');
const resistanceGroup = document.getElementById('resistance-group');

let selectedTrigger = null;
let selectedMood = null;
let selectedResistance = null;

function renderChoiceGroup(container, options, onSelect) {
  container.innerHTML = '';
  options.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn choice-btn-sm';
    btn.textContent = option;
    btn.dataset.value = option;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(option);
    });
    container.appendChild(btn);
  });
}

function updateDetailSubmitState() {
  detailSubmitBtn.disabled = !selectedTrigger;
}

function resetDetailPanel() {
  selectedTrigger = null;
  selectedMood = null;
  selectedResistance = null;
  detailMessage.textContent = '';
  detailResult.classList.add('hidden');
  detailResult.innerHTML = '';
  detailForm.classList.remove('hidden');
  updateDetailSubmitState();
}

function showDetailTab() {
  if (!lastLog) {
    detailEmpty.classList.remove('hidden');
    detailForm.classList.add('hidden');
    detailResult.classList.add('hidden');
    return;
  }

  detailEmpty.classList.add('hidden');
  renderChoiceGroup(triggerGroup, TRIGGER_OPTIONS[lastLog.actionType], (v) => {
    selectedTrigger = v;
    updateDetailSubmitState();
  });
  renderChoiceGroup(moodGroup, MOOD_OPTIONS, (v) => {
    selectedMood = v;
  });
  renderChoiceGroup(resistanceGroup, RESISTANCE_OPTIONS, (v) => {
    selectedResistance = v;
  });
}

detailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!lastLog) return;

  detailSubmitBtn.disabled = true;
  detailMessage.textContent = '';

  const { error: updateError } = await sbClient
    .from('logs')
    .update({
      trigger: selectedTrigger,
      mood: selectedMood,
      resistance_level: selectedResistance,
    })
    .eq('id', lastLog.id);

  if (updateError) {
    detailMessage.textContent = '送信に失敗しました。時間を置いて試してください。';
    detailMessage.className = 'form-message error';
    detailSubmitBtn.disabled = false;
    return;
  }

  const { data, error: fetchError } = await sbClient
    .from('logs')
    .select('regret')
    .eq('action_type', lastLog.actionType)
    .eq('trigger', selectedTrigger);

  detailForm.classList.add('hidden');
  detailResult.classList.remove('hidden');

  if (fetchError || !data) {
    detailResult.innerHTML = '<p class="ranking-empty">比較データの取得に失敗しました</p>';
    return;
  }

  const { total, rate } = computeRegretRate(data);
  const percent = Math.round(rate * 100);

  detailResult.innerHTML = `
    <p class="detail-result-lead">「${selectedTrigger}」がきっかけだった人（n=${total}）の後悔率</p>
    <div class="ranking-bar-track">
      <div class="ranking-bar-fill" style="width: ${percent}%"></div>
    </div>
    <p class="detail-result-percent">${percent}%</p>
    <p class="detail-result-sub">あなたと同じきっかけを選んだ人たちの結果です。多い/少ないは気にしすぎず、次の参考にどうぞ。</p>
  `;
});
