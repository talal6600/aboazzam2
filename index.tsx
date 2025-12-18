
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("React Render Error:", error);
  const display = document.getElementById('error-display');
  if (display) {
    display.style.display = 'block';
    document.getElementById('err-msg').textContent = "فشل تشغيل واجهة المستخدم. تأكد من تحديث المتصفح.";
  }
}
