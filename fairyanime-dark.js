// fairyanime ships its own dark mode (dark-mode.css) but defaults to light: its
// theme-toggle.js adds body.light-mode unless localStorage "site-theme" is "dark".
// Runs at document_start, before the page reads it. Only fills an empty value, so
// the site's own 🌙/☀️ button still works and its choice sticks.
if (!localStorage.getItem("site-theme")) localStorage.setItem("site-theme", "dark");
