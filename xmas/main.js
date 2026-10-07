// === GAS Web App 部署網址 ===
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbylhpmhV38QJ54i1ysZsNSBBLfaVgvQKFFh1HSEEvVNC-C55eO_hoCCF2xkmooxdmq7/exec";

// 票價設定
const PRICE_MEMBER = 350;
const PRICE_GUEST = 500;

let counts = { member: 0, guest: 0 };
const audio = document.getElementById("bg-music");
const musicToggleBtn = document.getElementById("music-toggle");

// 1. 下雪背景特效
const canvas = document.getElementById("snow-canvas");
const ctx = canvas.getContext("2d");
let flakes = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

for (let i = 0; i < 70; i++) {
  flakes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 3 + 1,
    d: Math.random() + 0.5
  });
}

function drawSnow() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  for (let f of flakes) {
    ctx.moveTo(f.x, f.y);
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
  }
  ctx.fill();
  updateSnow();
  requestAnimationFrame(drawSnow);
}

function updateSnow() {
  for (let f of flakes) {
    f.y += f.d;
    f.x += Math.sin(f.y / 30);
    if (f.y > canvas.height) {
      f.y = -10;
      f.x = Math.random() * canvas.width;
    }
  }
}
drawSnow();

// 2. 音樂啟動與頁面切換控制
function startAudioAndEnter() {
  if (audio && audio.paused) {
    audio.play().then(() => {
      if (musicToggleBtn) musicToggleBtn.innerText = "🎵";
    }).catch((err) => {
      console.log("瀏覽器阻擋自動播放，需使用者再次互動:", err);
    });
  }
  goToStep(2);
}

// 點擊按鈕進入第 2 頁並播放音樂
const btnStart = document.getElementById("btn-start");
if (btnStart) {
  btnStart.addEventListener("click", (e) => {
    e.stopPropagation();
    startAudioAndEnter();
  });
}

// 點擊首頁任意處也可進入第 2 頁並播放音樂
const step1 = document.getElementById("step-1");
if (step1) {
  step1.addEventListener("click", () => {
    startAudioAndEnter();
  });
}

// 音樂開關懸浮按鈕
if (musicToggleBtn) {
  musicToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      musicToggleBtn.innerText = "🎵";
    } else {
      audio.pause();
      musicToggleBtn.innerText = "🔇";
    }
  });
}

function goToStep(step) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("step-" + step);
  if (target) target.classList.add("active");
}

// 3. 票數計算器
function changeCount(type, delta) {
  counts[type] = Math.max(0, counts[type] + delta);
  document.getElementById(`${type}-count`).innerText = counts[type];

  const totalTickets = counts.member + counts.guest;
  const totalPrice = (counts.member * PRICE_MEMBER) + (counts.guest * PRICE_GUEST);

  document.getElementById("total-tickets").innerText = totalTickets;
  document.getElementById("total-price").innerText = totalPrice;

  document.getElementById("btn-to-step3").disabled = totalTickets === 0;
}

document.getElementById("btn-to-step3").addEventListener("click", () => {
  goToStep(3);
});

// 4. 手機號碼格式驗證 (台灣 09xxxxxxxx)
const phoneInput = document.getElementById("cust-phone");
const phoneHint = document.getElementById("phone-hint");

phoneInput.addEventListener("input", (e) => {
  const val = e.target.value.replace(/\D/g, ""); // 只保留數字
  e.target.value = val;
  if (val.length === 10 && /^09\d{8}$/.test(val)) {
    phoneHint.innerText = "";
  } else if (val.length > 0) {
    phoneHint.innerText = "格式需為 09 開頭的 10 位數字";
  } else {
    phoneHint.innerText = "";
  }
});

// 5. 發送驗證碼
const btnSendCode = document.getElementById("btn-send-code");
btnSendCode.addEventListener("click", async () => {
  const email = document.getElementById("cust-email").value.trim();
  if (!email || !email.includes("@")) {
    alert("請先輸入有效的電子信箱！");
    return;
  }

  btnSendCode.disabled = true;
  btnSendCode.innerText = "發送中...";

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "sendCode", email: email })
    });
    const result = await res.json();

    if (result.success) {
      alert("驗證碼已寄出，請至信箱收取（可能需要檢查垃圾郵件匣）");
      startCountdown(60);
    } else {
      alert(result.message || "發送失敗，請稍後重試");
      btnSendCode.disabled = false;
      btnSendCode.innerText = "傳送驗證碼";
    }
  } catch (err) {
    alert("連線異常，請稍後再試");
    btnSendCode.disabled = false;
    btnSendCode.innerText = "傳送驗證碼";
  }
});

function startCountdown(sec) {
  let count = sec;
  btnSendCode.disabled = true;
  const timer = setInterval(() => {
    btnSendCode.innerText = `${count}s 重發`;
    count--;
    if (count < 0) {
      clearInterval(timer);
      btnSendCode.disabled = false;
      btnSendCode.innerText = "傳送驗證碼";
    }
  }, 1000);
}

// 6. 送出報名並核驗
const btnSubmit = document.getElementById("btn-submit");
btnSubmit.addEventListener("click", async () => {
  const name = document.getElementById("cust-name").value.trim();
  const phone = document.getElementById("cust-phone").value.trim();
  const email = document.getElementById("cust-email").value.trim();
  const verifyCode = document.getElementById("cust-code").value.trim();

  if (!name || !phone || !email || !verifyCode) {
    alert("請完整填寫所有欄位！");
    return;
  }

  if (!/^09\d{8}$/.test(phone)) {
    alert("手機號碼格式不正確（需為 09 開頭 10 碼）");
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerText = "報名處理中...";

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submitRegistration",
        memberCount: counts.member,
        guestCount: counts.guest,
        name: name,
        phone: phone,
        email: email,
        verifyCode: verifyCode
      })
    });
    const result = await res.json();

    if (result.success) {
      document.getElementById("ticket-badge").innerText = "票券編號：" + result.ticketId;
      goToStep("success");
    } else {
      alert(result.message);
      btnSubmit.disabled = false;
      btnSubmit.innerText = "確認送出並領票";
    }
  } catch (err) {
    alert("報名送出失敗，請確認網路連線或稍後再試");
    btnSubmit.disabled = false;
    btnSubmit.innerText = "確認送出並領票";
  }
});
