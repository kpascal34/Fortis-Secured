import React from 'react';
import { contrastRatio, meetsWCAGAA } from '../../lib/contrast.js';

const checks = [
  { label: 'Body text on background', fg: '#F3F7FF', bg: '#0B1220' },
  { label: 'Muted text on surface', fg: '#A9B6CD', bg: '#121A2B' },
  { label: 'Primary button text', fg: '#051018', bg: '#36D2C4' },
  { label: 'Disabled text on disabled bg', fg: '#95A1B6', bg: '#283247' },
];

const UIAudit = () => {
  return (
    <div className="space-y-6">
      <header className="glass-panel">
        <h1 className="text-2xl font-semibold">UI Audit (dev only)</h1>
        <p className="mt-2 text-text-2">Quick visual pass for sidebar, cards, form fields, table, modal and banner states.</p>
      </header>

      <section className="glass-panel space-y-3">
        <h2 className="text-lg font-semibold">Contrast checks</h2>
        {checks.map((item) => {
          const ratio = contrastRatio(item.fg, item.bg);
          const pass = meetsWCAGAA(item.fg, item.bg);
          return (
            <div key={item.label} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-b-0">
              <span>{item.label}</span>
              <span className={pass ? 'text-green-400' : 'text-red-400'}>
                {ratio}:1 ({pass ? 'AA pass' : 'AA fail'})
              </span>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel">
          <h3 className="mb-3 font-semibold">Form fields</h3>
          <div className="space-y-2">
            <input className="input-glass" placeholder="Readable placeholder" />
            <input className="input-glass" value="Disabled state" disabled readOnly />
            <select className="select-glass" defaultValue="">
              <option value="" disabled>Select option</option>
              <option>Option A</option>
            </select>
          </div>
        </div>

        <div className="glass-panel">
          <h3 className="mb-3 font-semibold">Banner</h3>
          <div className="fs-banner">System notice: visual tokens are applied with semantic classes.</div>
        </div>
      </section>

      <section className="fs-table overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr><th className="px-4 py-3 text-left">Table</th><th className="px-4 py-3 text-left">Value</th></tr>
          </thead>
          <tbody>
            <tr><td className="px-4 py-3">Row A</td><td className="px-4 py-3 text-text-2">Readable text</td></tr>
            <tr><td className="px-4 py-3">Row B</td><td className="px-4 py-3 text-text-2">Hover and stripe check</td></tr>
          </tbody>
        </table>
      </section>

      <section className="fs-modal-overlay static">
        <div className="fs-modal">
          <h3 className="text-lg font-semibold">Modal sample</h3>
          <p className="mt-2 text-text-2">Overlay uses dark tint (no white washout) for stronger contrast.</p>
        </div>
      </section>
    </div>
  );
};

export default UIAudit;
