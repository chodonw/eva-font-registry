const form = document.querySelector('#login-form');
const identifierInput = document.querySelector('#identifier');
const codeInput = document.querySelector('#code');
const codeRow = document.querySelector('#code-row');
const submitButton = document.querySelector('#submit-button');
const status = document.querySelector('#form-status');
let codeSent = false;

function detail(payload, fallback) {
  return payload && typeof payload.detail === 'string' ? payload.detail : fallback;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const identifier = identifierInput.value.trim().toLowerCase();
  if (!['wxd', 'lyn'].includes(identifier)) {
    status.textContent = '当前仅开放给 wxd 与 lyn。';
    return;
  }
  submitButton.disabled = true;
  status.textContent = codeSent ? '正在验证…' : '正在发送…';
  try {
    if (!codeSent) {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(detail(payload, '验证码发送失败'));
      codeSent = true;
      identifierInput.readOnly = true;
      codeRow.hidden = false;
      codeInput.required = true;
      codeInput.focus();
      submitButton.textContent = '验证并登录';
      status.textContent = `验证码已发送，${Number(payload.cooldown) || 60} 秒后可重发。`;
    } else {
      const code = codeInput.value.trim();
      if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位验证码');
      const response = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, code })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(detail(payload, '验证码无效或已过期'));
      const requested = new URLSearchParams(location.search).get('returnTo') || '/admin';
      location.replace(requested.startsWith('/') && !requested.startsWith('//') ? requested : '/admin');
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : '操作失败';
  } finally {
    submitButton.disabled = false;
  }
});
