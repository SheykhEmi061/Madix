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
    document.body.classList.toggle('sidebar-open', open);
  }

  menuToggle.addEventListener('click', () => setSidebar(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setSidebar(false));
  sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setSidebar(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSidebar(false);
  });
})();
