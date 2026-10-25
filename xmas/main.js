// === GAS 後端部署 URL ===
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbziZu_kkuy0vOoydjRaSqO56wJVQ7-f90-GsK3Br7wiGxikomCYf4tqqPbhRoZXifb0/exec";

// 判斷 12/1 前後時限
const NOW = new Date();
const EARLY_BIRD_DEADLINE = new Date("2026-12-01T00:00:00");
const isEarlyBird = NOW < EARLY_BIRD_DEADLINE;

let adultPrice = isEarlyBird ? 250 : 300;
let dynamicMaxAdult = 25; // 預設早鳥上限
let couponDiscount = 0;
let counts = { adult: 0, child: 0 };

// 影音多媒體元素
const posterImg = document.getElementById("poster-img");
const videoJump = document.getElementById("video-jump");
const videoMoonwalk = document.getElementById("video-moonwalk");
const flashLayer = document.getElementById("cutscene-flash");
const audio = document.getElementById("bg-music");
const musicToggleBtn = document.getElementById("music-toggle");

// =================================
// 1. 初始化票額與後台設定讀取
// =================================
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("adult-price-display").innerText = adultPrice;

  // 12.1 之後優惠代碼逾期顯示
  if (!isEarlyBird) {
    const couponArea = document.getElementById("coupon-area");
    if (couponArea) {
      couponArea.innerHTML = `<div class="hint-text fail">早鳥優惠折扣已於 2026.12.01 截止</div>`;
    }
  }

  // 向 GAS 後端取得最新設定與剩餘票數
  await fetchTicketConfig();
});

async function fetchTicketConfig() {
  try {
    const res = await fetch(GAS_API_URL + "?action=getTicketConfig");
    const cfg = await res.json();
    if (!cfg.success) return;

    const adultTag = document.getElementById("adult-tag");
    const adultTitle = document.getElementById("adult-title");

    if (isEarlyBird) {
      const remaining = Math.max(0, cfg.earlyBirdLimit - cfg.soldAdultCount);
      dynamicMaxAdult = remaining;
      adultTitle.innerText = "全票（早鳥優惠）";
      adultTag.className = "chip gold";
      adultTag.innerText = `早鳥限量剩餘 ${remaining} 張`;
    } else {
      adultTitle.innerText = "全票（晚鳥原價）";
      const lateLimit = cfg.lateBirdReleased;
      dynamicMaxAdult = lateLimit;

      if (lateLimit > 0 && cfg.isLateBirdOpen) {
        adultTag.className = "chip gold";
        adultTag.innerText = `晚鳥釋出剩餘 ${lateLimit} 張`;
      } else {
        adultTag.className = "chip red";
        adultTag.innerText = "晚鳥票已售罄";
        document.getElementById("btn-to-step3").disabled = true;
      }
    }
  } catch (err) {
    console.log("票額同步失敗，沿用前端預設設定", err);
  }
}

// =================================
// 2. 音樂與雙段影片過場控制邏輯
// =================================
function playBGM() {
  if (audio && audio.paused) {
    audio.play().catch(e => console.log("需點擊互動播放音訊:", e));
  }
}

if (musicToggleBtn) {
  musicToggleBtn.addEventListener("click", () => {
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

document.addEventListener("visibilitychange", () => {
  if (document.hidden && audio) {
    audio.pause();
    if (musicToggleBtn) musicToggleBtn.innerText = "🔇";
  }
});

// 首頁點擊「點擊購票」觸發完整過場動畫
document.getElementById("btn-start").addEventListener("click", () => {
  playBGM();
  startCutsceneSequence();
});

function startCutsceneSequence() {
  // 1. 隱藏首頁按鈕，顯示第一段影片（跳下月亮）
  document.getElementById("step-1").classList.remove("active");
  videoJump.classList.add("visible");
  posterImg.classList.remove("visible");

  videoJump.currentTime = 0;
  videoJump.play().catch(e => console.log("Video Jump play prevented:", e));

  // 2. 當第一段影片播畢時，觸發過場閃白與第二段影片（月球漫步循環）
  videoJump.onended = () => {
    triggerFlashTransition();
  };
}

function triggerFlashTransition() {
  // 閃光過場效果
  flashLayer.classList.add("active");

  setTimeout(() => {
    // 隱藏第一段影片，啟動第二段無縫循環影片
    videoJump.classList.remove("visible");
    videoJump.pause();

    videoMoonwalk.classList.add("visible");
    videoMoonwalk.currentTime = 0;
    videoMoonwalk.play().catch(e => console.log("Video Moonwalk play prevented:", e));

    // 背景微暗、卡片向上淡入浮現
    document.body.classList.add("in-subpage");
    flashLayer.classList.remove("active");
    goToStep(2);
  }, 350);
}

function goToStep(step) {
  document.querySelectorAll(".page-view").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("step-" + step);
  if (target) target.classList.add("active");

  if (step === 1 || step === "1") {
    document.body.classList.remove("in-subpage");
  } else {
    document.body.classList.add("in-subpage");
  }
}

// =================================
// 3. 票數計算與結算 (必須購買至少 1 張全票陪同)
// =================================
function changeCount(type, delta) {
  if (type === "child") {
    counts.child = Math.max(0, Math.min(2, counts.child + delta));
    document.getElementById("child-count").innerText = counts.child;
  } else {
    counts.adult = Math.max(0, Math.min(dynamicMaxAdult, counts.adult + delta));
    document.getElementById("adult-count").innerText = counts.adult;
  }
  updateSummary();
}

function updateSummary() {
  const totalTickets = counts.adult + counts.child;
  const propsCount = counts.adult; // 僅全票附贈道具
  const grossPrice = (counts.adult * adultPrice);
  const netPrice = Math.max(0, grossPrice - couponDiscount);

  document.getElementById("sum-tickets").innerText = totalTickets;
  document.getElementById("sum-props").innerText = propsCount;
  document.getElementById("sum-price").innerText = netPrice;

  const btnNext = document.getElementById("btn-to-step3");

  // 核心規則檢核：不能單獨只選兒童免票
  if (counts.adult >= 1) {
    btnNext.disabled = false;
    btnNext.innerText = "下一步：填寫實名資料";
  } else if (counts.child > 0) {
    btnNext.disabled = true;
    btnNext.innerText = "需至少一位全票陪同入場";
  } else {
    btnNext.disabled = true;
    btnNext.innerText = "請選擇購票數量";
  }
}

// 優惠碼 NCKUBBB 折抵 50
const btnApplyCoupon = document.getElementById("btn-apply-coupon");
if (btnApplyCoupon) {
  btnApplyCoupon.addEventListener("click", () => {
    if (!isEarlyBird) {
      alert("早鳥優惠代碼已於 2026.12.01 截止失效！");
      return;
    }
    const code = document.getElementById("coupon-code").value.trim().toUpperCase();
    const hint = document.getElementById("coupon-hint");

    if (code === "NCKUBBB") {
      couponDiscount = 50;
      hint.className = "hint-text ok";
      hint.innerText = "✓ 優惠代碼套用成功！折抵 NT$ 50 元";
    } else {
      couponDiscount = 0;
      hint.className = "hint-text fail";
      hint.innerText = "✗ 無效的優惠代碼";
    }
    updateSummary();
  });
}

// =================================
// 4. 動態展開實名制名冊
// =================================
document.getElementById("btn-to-step3").addEventListener("click", () => {
  if (counts.adult < 1) {
    alert("14 歲（含）以下兒童需至少一位成人（全票）陪同入場！");
    return;
  }
  renderAttendeeCards();
  goToStep(3);
});

function renderAttendeeCards() {
  const container = document.getElementById("dynamic-attendees");
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "block-title";
  header.innerText = `全票實名名單（共 ${counts.adult} 位，附活動道具，當天請備妥證件）：`;
  container.appendChild(header);

  for (let i = 1; i <= counts.adult; i++) {
    const card = document.createElement("div");
    card.className = "attendee-card";
    card.innerHTML = `
      <div style="font-size:12px; color:#f7d070; margin-bottom:6px;"><strong>第 ${i} 位全票持有人</strong></div>
      <div class="field-item">
        <label>真實姓名 *</label>
        <input type="text" class="att-name" placeholder="請填寫有效身分證件全名" required>
      </div>
      <div class="field-item">
        <label>身分證後4碼 / 證件號 *</label>
        <input type="text" class="att-id" maxlength="8" placeholder="現場核驗比對使用" required>
      </div>
    `;
    container.appendChild(card);
  }
}

// =================================
// 5. 寄送驗證碼與送出訂單
// =================================
const btnSendVerify = document.getElementById("btn-send-verify");
btnSendVerify.addEventListener("click", async () => {
  const email = document.getElementById("main-email").value.trim();
  if (!email || !email.includes("@")) {
    alert("請先輸入有效的電子信箱！");
    return;
  }

  btnSendVerify.disabled = true;
  btnSendVerify.innerText = "發送中...";

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "sendCode", email: email })
    });
    const result = await res.json();
    if (result.success) {
      alert("驗證碼已寄出，請至信箱收取！");
      let sec = 60;
      const timer = setInterval(() => {
        btnSendVerify.innerText = `${sec}s 重發`;
        sec--;
        if (sec < 0) {
          clearInterval(timer);
          btnSendVerify.disabled = false;
          btnSendVerify.innerText = "傳送驗證碼";
        }
      }, 1000);
    } else {
      alert(result.message || "發送失敗");
      btnSendVerify.disabled = false;
      btnSendVerify.innerText = "傳送驗證碼";
    }
  } catch (e) {
    alert("連線異常，請稍後再試！");
    btnSendVerify.disabled = false;
    btnSendVerify.innerText = "傳送驗證碼";
  }
});

// 確認送出訂單
document.getElementById("btn-submit-order").addEventListener("click", async () => {
  if (counts.adult < 1) {
    alert("14 歲（含）以下免票孩童需至少一位成人（全票）陪同入場！");
    goToStep(2);
    return;
  }

  const mainName = document.getElementById("main-name").value.trim();
  const mainPhone = document.getElementById("main-phone").value.trim();
  const mainEmail = document.getElementById("main-email").value.trim();
  const mainCode = document.getElementById("main-code").value.trim();

  if (!mainName || !mainPhone || !mainEmail || !mainCode) {
    alert("請完整填寫聯絡人資料與 6 位數驗證碼！");
    return;
  }

  // 檢驗全票持有人實名名冊
  const attNames = document.querySelectorAll(".att-name");
  const attIds = document.querySelectorAll(".att-id");
  let attendees = [];

  for (let i = 0; i < attNames.length; i++) {
    const nameVal = attNames[i].value.trim();
    const idVal = attIds[i].value.trim();
    if (!nameVal || !idVal) {
      alert(`請完整填寫第 ${i + 1} 位全票持有人實名姓名與證件號！`);
      return;
    }
    attendees.push({ name: nameVal, idLast4: idVal });
  }

  const btnSubmit = document.getElementById("btn-submit-order");
  btnSubmit.disabled = true;
  btnSubmit.innerText = "系統劃位中...";

  try {
    const payload = {
      action: "submitMoonwalkerBooking",
      contactName: mainName,
      contactPhone: mainPhone,
      contactEmail: mainEmail,
      verifyCode: mainCode,
      adultCount: counts.adult,
      childCount: counts.child,
      attendees: attendees,
      totalAmount: parseInt(document.getElementById("sum-price").innerText)
    };

    const res = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      document.getElementById("ticket-badge").innerText = "票券編號：" + result.ticketId;
      goToStep("success");

      if (typeof confetti === "function") {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f7d070', '#d4a337', '#3b82f6', '#ffffff']
        });
      }
    } else {
      alert(result.message || "報名驗證未通過");
      btnSubmit.disabled = false;
      btnSubmit.innerText = "確認送出並取票";
    }
  } catch (err) {
    alert("連線逾時，請確認網路後重新送出！");
    btnSubmit.disabled = false;
    btnSubmit.innerText = "確認送出並取票";
  }
});
