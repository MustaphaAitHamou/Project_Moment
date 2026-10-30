import type { ReactNode } from 'react';

/** Tableau d'administration simple, défilant horizontalement sur mobile. */
export function DataTable({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-sunken text-xs uppercase tracking-wide text-subtle">
          <tr>{head.map((cell, index) => <th key={index} className="px-3 py-2.5 text-start font-semibold">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty ? <div className="p-6 text-center text-sm text-muted">{empty}</div> : null}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className ?? ''}`}>{children}</td>;
}
