(() => {
  const scanButton = document.querySelector('#scanButton');
  const exportButton = document.querySelector('#exportButton');
  const toast = document.querySelector('#toast');
  const sidebar = document.querySelector('#sidebar');
  const menuToggle = document.querySelector('#menuToggle');
  const backdrop = document.querySelector('#sidebarBackdrop');
  const search = document.querySelector('#repoSearch');
  const filterButton = document.querySelector('#filterButton');
  const repoRows = [...document.querySelectorAll('#repoRows tr')];
  const emptyState = document.querySelector('#emptyState');
  const visibleCount = document.querySelector('#visibleCount');
  const settingsSaved = document.querySelector('#settingsSaved');
  const settingSwitches = [...document.querySelectorAll('[data-setting]')];
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  scanButton.addEventListener('click', () => {
    if (scanButton.disabled) return;
    scanButton.disabled = true;
    scanButton.classList.add('is-loading');
    scanButton.setAttribute('aria-busy', 'true');
    showToast('اسکن امنیتی فضای کاری آغاز شد.');
    window.setTimeout(() => {
      scanButton.disabled = false;
      scanButton.classList.remove('is-loading');
      scanButton.removeAttribute('aria-busy');
      showToast('اسکن جدید در صف اجرا قرار گرفت.');
    }, 1450);
  });

  exportButton.addEventListener('click', () => {
    const report = [
      'گزارش امنیتی مادیکس',
      'فضای کاری: آذرخش استودیو',
      'امتیاز امنیت: ۸۶ از ۱۰۰',
      'آسیب‌پذیری‌های باز: ۲۴ (۲ بحرانی، ۵ بالا، ۹ متوسط، ۸ پایین)',
      'مخازن متصل: ۱۲',
      'آخرین اسکن: امروز، ۱۰:۴۲'
    ].join('\n');
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'madix-security-report.txt';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('گزارش امنیتی دانلود شد.');
  });

  function filterRepositories() {
    const query = search.value.trim().toLocaleLowerCase();
    const criticalOnly = filterButton.getAttribute('aria-pressed') === 'true';
    let count = 0;
    repoRows.forEach((row) => {
      const matchesText = row.textContent.toLocaleLowerCase().includes(query);
      const matchesSeverity = !criticalOnly || ['critical', 'high'].includes(row.dataset.severity);
      const visible = matchesText && matchesSeverity;
      row.hidden = !visible;
      if (visible) count += 1;
    });
    visibleCount.textContent = new Intl.NumberFormat('fa-IR').format(count);
    emptyState.hidden = count > 0;
  }

  search.addEventListener('input', filterRepositories);
  filterButton.addEventListener('click', () => {
    const enabled = filterButton.getAttribute('aria-pressed') !== 'true';
    filterButton.setAttribute('aria-pressed', String(enabled));
    filterRepositories();
    showToast(enabled ? 'فقط مخازن با ریسک بالا نمایش داده می‌شوند.' : 'همه مخازن نمایش داده می‌شوند.');
  });

  function setSidebar(open) {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('visible', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
    sidebar.inert = window.matchMedia('(max-width: 900px)').matches && !open;
    document.body.classList.toggle('sidebar-open', open);
  }

  setSidebar(false);
  menuToggle.addEventListener('click', () => setSidebar(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setSidebar(false));
  window.matchMedia('(max-width: 900px)').addEventListener('change', () => setSidebar(false));
  sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setSidebar(false)));

  const settingDefaults = { mfa: true, criticalAlerts: true, dailyScan: true };
  const settingsKey = 'madix-dashboard-settings-v1';
  let savedSettings = {};
  try {
    savedSettings = JSON.parse(window.localStorage.getItem(settingsKey) || '{}') || {};
  } catch {
    settingsSaved.textContent = 'ذخیره محلی در این مرورگر در دسترس نیست';
  }

  settingSwitches.forEach((control) => {
    const key = control.dataset.setting;
    const enabled = typeof savedSettings[key] === 'boolean' ? savedSettings[key] : settingDefaults[key];
    control.setAttribute('aria-checked', String(enabled));
    control.addEventListener('click', () => {
      const nextValue = control.getAttribute('aria-checked') !== 'true';
      control.setAttribute('aria-checked', String(nextValue));
      savedSettings[key] = nextValue;
      try {
        window.localStorage.setItem(settingsKey, JSON.stringify(savedSettings));
        settingsSaved.textContent = 'تغییرات ذخیره شد';
      } catch {
        settingsSaved.textContent = 'تغییر فقط برای این نشست اعمال شد';
      }
      showToast(nextValue ? 'این سیاست امنیتی فعال شد.' : 'این سیاست امنیتی غیرفعال شد.');
    });
  });

  document.querySelector('.notification-button').addEventListener('click', () => {
    showToast('۲ اعلان امنیتی برای بررسی دارید.');
  });
  document.querySelectorAll('.more-button').forEach((button) => {
    button.addEventListener('click', () => showToast('اطلاعات این بخش در نمای فعلی به‌روز است.'));
  });
  document.querySelectorAll('.row-more').forEach((button) => {
    button.addEventListener('click', () => {
      const repository = button.closest('tr').querySelector('.repo-name strong').textContent;
      showToast(`جزئیات مخزن ${repository} در فهرست امنیتی نمایش داده شده است.`);
    });
  });
  document.querySelector('.profile-button').addEventListener('click', () => {
    showToast('حساب کاربری سارا احمدی در این نمای داشبورد نمایش داده شده است.');
  });

  const navLinks = [...document.querySelectorAll('.nav-item[href^="#"]')];
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach((link) => {
        const active = link.hash === `#${current.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.1, 0.5] });
    navSections.forEach((section) => sectionObserver.observe(section));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSidebar(false);
  });
})();
