(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Scroll Progress Bar
  var progress = document.getElementById("scrollProgress");
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    if (progress) {
      progress.style.width = (max ? (doc.scrollTop / max) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // 2. Intersection Observer Reveal Animations
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el, index) {
      el.style.transitionDelay = Math.min(index % 6, 5) * 0.055 + "s";
      io.observe(el);
    });
  }



  // 4. Hero spotlight mouse effect & tilt visual window
  var hero = document.querySelector(".hero");
  var spot = document.getElementById("heroSpot");
  var mock = document.getElementById("heroMock");
  if (hero && !reduce) {
    hero.addEventListener("mousemove", function (event) {
      var rect = hero.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      if (spot) {
        spot.style.setProperty("--mx", x * 100 + "%");
        spot.style.setProperty("--my", y * 100 + "%");
      }
      if (mock) {
        mock.style.transform = "translate(-50%,-50%) perspective(900px) rotateX(" + ((0.5 - y) * 8) + "deg) rotateY(" + ((x - 0.5) * 10) + "deg)";
      }
    });
    hero.addEventListener("mouseleave", function () {
      if (mock) {
        mock.style.transform = "translate(-50%,-50%)";
      }
    });
  }


  // 6. Base32 Decoding
  function base32ToBytes(str) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    var cleaned = str.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
    if (cleaned.length === 0) return null;

    // Validate characters
    for (var i = 0; i < cleaned.length; i++) {
      if (alphabet.indexOf(cleaned[i]) === -1) {
        return null;
      }
    }

    var bytes = [];
    var bits = 0;
    var value = 0;

    for (var i = 0; i < cleaned.length; i++) {
      var val = alphabet.indexOf(cleaned[i]);
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  // 7. TOTP Generator using Web Crypto API (RFC 6238)
  async function calculateTOTP(secretBase32, digits, timeStep) {
    digits = digits || 6;
    timeStep = timeStep || 30;

    var keyBytes = base32ToBytes(secretBase32);
    if (!keyBytes) return "ERROR";

    try {
      // Import the key raw bytes for HMAC-SHA1
      var cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
      );

      // Get counter based on current time step
      var counter = Math.floor(Date.now() / 1000 / timeStep);

      // Create 8-byte big-endian counter buffer
      var buffer = new ArrayBuffer(8);
      var view = new DataView(buffer);
      var high = Math.floor(counter / 0x100000000);
      var low = counter % 0x100000000;
      view.setUint32(0, high);
      view.setUint32(4, low);

      // Generate the HMAC signature
      var signature = await window.crypto.subtle.sign("HMAC", cryptoKey, buffer);
      var signatureBytes = new Uint8Array(signature);

      // Dynamic Truncation
      var offset = signatureBytes[signatureBytes.length - 1] & 0x0f;
      var binary =
        ((signatureBytes[offset] & 0x7f) << 24) |
        ((signatureBytes[offset + 1] & 0xff) << 16) |
        ((signatureBytes[offset + 2] & 0xff) << 8) |
        (signatureBytes[offset + 3] & 0xff);

      var otp = binary % Math.pow(10, digits);
      return otp.toString().padStart(digits, "0");
    } catch (err) {
      console.error("Error calculating TOTP:", err);
      return "ERROR";
    }
  }

  // 8. Formatting codes as "123 456" for UI
  function formatCode(code) {
    if (!code || code === "ERROR" || code.length !== 6) return code;
    return code.substring(0, 3) + " " + code.substring(3);
  }

  // 9. Escape HTML helper
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 10. Mask secret key in list for security
  function maskSecret(secret) {
    if (!secret) return "";
    var cleaned = secret.replace(/\s+/g, "").toUpperCase();
    if (cleaned.length <= 8) return "••••••••";
    return cleaned.substring(0, 4) + "••••••••" + cleaned.substring(cleaned.length - 4);
  }

  // 11. Custom Toast Notifications
  function showToast(message) {
    var container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.style.position = "fixed";
      container.style.bottom = "20px";
      container.style.right = "20px";
      container.style.zIndex = "999";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";
      document.body.appendChild(container);
    }
    
    var toast = document.createElement("div");
    toast.style.background = "rgba(10, 10, 10, 0.9)";
    toast.style.color = "var(--ink)";
    toast.style.border = "1px solid rgba(74, 222, 128, 0.35)";
    toast.style.padding = "0.75rem 1.25rem";
    toast.style.borderRadius = "8px";
    toast.style.fontFamily = "var(--mono)";
    toast.style.fontSize = "0.82rem";
    toast.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.5)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "0.5rem";
    toast.style.animation = "slideDown 0.25s ease-out";
    toast.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--ok);"></i> <span>' + escapeHtml(message) + '</span>';
    
    container.appendChild(toast);
    
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.5s ease";
      setTimeout(function () {
        toast.remove();
      }, 500);
    }, 2500);
  }

  // 12. Local storage accounts disabled by user request.

  // 13. Timer Countdown and Codes Refresh Loop
  var activeSecret = "";
  
  var circle = document.querySelector(".progress-ring__circle");
  if (circle) {
    circle.style.strokeDasharray = "113";
    circle.style.strokeDashoffset = "113";
  }

  function setProgress(percent) {
    if (!circle) return;
    var offset = 113 - (percent / 100 * 113);
    circle.style.strokeDashoffset = offset;
  }

  async function updateAllCodes() {
    // 1. Update main active TOTP
    if (activeSecret) {
      var code = await calculateTOTP(activeSecret);
      var codeEl = document.getElementById("largeTotpCode");
      if (codeEl) {
        var formatted = formatCode(code);
        if (codeEl.innerText !== formatted) {
          codeEl.classList.add("refreshing");
          setTimeout(function () {
            codeEl.innerText = formatted;
            codeEl.setAttribute("data-code", code);
            codeEl.classList.remove("refreshing");
          }, 150);
        }
      }
    }
  }

  function runCountdown() {
    var now = Date.now();
    var seconds = Math.floor(now / 1000);
    var remaining = 30 - (seconds % 30);

    var timerText = document.getElementById("timerText");
    if (timerText) {
      timerText.innerText = remaining;
    }

    var percent = (remaining / 30) * 100;
    setProgress(percent);

    // Whenever remaining is 30, it indicates a cycle roll-over
    // We update codes on every tick anyway to be perfectly synchronized, but roll-overs are critical
    updateAllCodes();
  }

  // Start the ticking timer loop
  setInterval(runCountdown, 1000);
  runCountdown(); // Run immediately

  // 14. UI Interaction & Form Handlers
  var totpForm = document.getElementById("totpForm");
  var secretInput = document.getElementById("secretInput");
  var totpSubmit = document.getElementById("totpSubmit");
  var totpResult = document.getElementById("totpResult");
  var stepTwoBox = document.getElementById("stepTwoBox");
  var stepTwoPill = document.getElementById("stepTwoPill");
  var stepOnePill = document.getElementById("stepOnePill");
  
  var displayIssuerName = document.getElementById("displayIssuerName");

  function setTotpResult(type, icon, text) {
    if (totpResult) {
      totpResult.className = "cdk-result" + (type ? " " + type : "");
      totpResult.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + text + '</span>';
    }
  }

  if (totpForm) {
    totpForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var secret = secretInput.value.trim();

      if (!secret) {
        setTotpResult("err", "fa-triangle-exclamation", "Vui lòng nhập khóa bí mật trước.");
        return;
      }

      var cleaned = secret.replace(/\s+/g, "").toUpperCase();
      var keyBytes = base32ToBytes(cleaned);

      if (!keyBytes) {
        setTotpResult("err", "fa-circle-xmark", "Khóa bí mật không hợp lệ. Phải là chuỗi ký tự Base32 (chỉ bao gồm chữ cái A-Z và số 2-7).");
        if (stepTwoBox) stepTwoBox.hidden = true;
        if (stepTwoPill) stepTwoPill.classList.remove("active");
        if (stepOnePill) stepOnePill.classList.add("active");
        activeSecret = "";
        return;
      }

      // Valid Key
      activeSecret = cleaned;

      setTotpResult("ok", "fa-circle-check", "Khóa bí mật hợp lệ! Trình tạo mã đang tính toán và hiển thị mã OTP.");

      if (displayIssuerName) displayIssuerName.innerText = "Khóa: " + maskSecret(cleaned);
      if (stepTwoBox) stepTwoBox.hidden = false;
      if (stepTwoPill) stepTwoPill.classList.add("active");
      
      // Update codes right away
      updateAllCodes();
      
      // Scroll to display box if mobile
      if (window.innerWidth <= 720) {
        stepTwoBox.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // 15. Action Button Listeners
  var btnCopyTotp = document.getElementById("btnCopyTotp");
  if (btnCopyTotp) {
    btnCopyTotp.addEventListener("click", function () {
      var codeEl = document.getElementById("largeTotpCode");
      if (codeEl) {
        var rawCode = codeEl.getAttribute("data-code") || codeEl.innerText.replace(/\s+/g, "");
        if (rawCode && rawCode !== "000000" && rawCode !== "ERROR") {
          navigator.clipboard.writeText(rawCode).then(function () {
            showToast("Đã sao chép mã OTP: " + rawCode);
          });
        }
      }
    });
  }

  // Bấm vào mã OTP to cũng tự động sao chép
  var largeTotpCode = document.getElementById("largeTotpCode");
  if (largeTotpCode) {
    largeTotpCode.addEventListener("click", function () {
      var rawCode = this.getAttribute("data-code") || this.innerText.replace(/\s+/g, "");
      if (rawCode && rawCode !== "000000" && rawCode !== "ERROR") {
        navigator.clipboard.writeText(rawCode).then(function () {
          showToast("Đã sao chép mã OTP: " + rawCode);
        });
      }
    });
  }

  // Save and delete functionality removed.

  // 16. Auto-load Key from URL (Path segment, Hash or Query parameter)
  function isValidBase32(str) {
    if (!str) return false;
    var cleaned = str.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
    if (cleaned.length < 8) return false;
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    for (var i = 0; i < cleaned.length; i++) {
      if (alphabet.indexOf(cleaned[i]) === -1) {
        return false;
      }
    }
    return true;
  }

  function checkUrlForKey() {
    // Check hash (e.g. domain.com/#JBSWY3DPEHPK3PXP)
    var hash = window.location.hash.substring(1).trim();
    if (isValidBase32(hash)) return hash;

    // Check query string (e.g. domain.com/?JBSWY3DPEHPK3PXP)
    var search = window.location.search.substring(1).trim();
    if (isValidBase32(search)) return search;
    
    // Check query param key (e.g. domain.com/?key=JBSWY3DPEHPK3PXP)
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var keyParam = urlParams.get("key") || urlParams.get("secret") || urlParams.get("k");
      if (keyParam && isValidBase32(keyParam)) return keyParam;
    } catch (e) {}

    // Check path segment (e.g. domain.com/JBSWY3DPEHPK3PXP)
    var segments = window.location.pathname.split('/').filter(Boolean);
    var lastSegment = segments[segments.length - 1] || "";
    if (lastSegment && lastSegment.toLowerCase() !== "index.html" && isValidBase32(lastSegment)) {
      return lastSegment;
    }

    return null;
  }

  var autoKey = checkUrlForKey();
  if (autoKey && secretInput && totpForm) {
    secretInput.value = autoKey;
    setTimeout(function() {
      if (typeof totpForm.requestSubmit === "function") {
        totpForm.requestSubmit();
      } else {
        totpForm.dispatchEvent(new Event("submit"));
      }
    }, 100);
  }

  // 17. Initialization completed.

})();
