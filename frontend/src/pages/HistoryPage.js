import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

export default function HistoryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getCreditHistory()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const txTypeStyle = {
    earned: { color: '#10b981', prefix: '+' },
    bonus: { color: '#10b981', prefix: '+' },
    signup_bonus: { color: '#10b981', prefix: '+' },
    refund: { color: '#06b6d4', prefix: '+' },
    spent: { color: '#ef4444', prefix: '-' },
  };

  const txTypeLabel = {
    earned: 'Earned',
    bonus: 'Bonus',
    signup_bonus: 'Signup Bonus',
    refund: 'Refund',
    spent: 'Spent',
  };

  return (
    <div className="page">
      <h1 style={s.title}>Transaction History</h1>

      {/* Summary cards */}
      {data && (
        <div style={s.summaryGrid}>
          <div style={s.summaryCard}>
            <p style={s.summaryLabel}>Current Balance</p>
            <p style={{ ...s.summaryValue, color: '#a5b4fc' }}>{data.summary.current_balance}</p>
          </div>
          <div style={s.summaryCard}>
            <p style={s.summaryLabel}>Total Earned</p>
            <p style={{ ...s.summaryValue, color: '#6ee7b7' }}>+{data.summary.total_earned}</p>
          </div>
          <div style={s.summaryCard}>
            <p style={s.summaryLabel}>Total Spent</p>
            <p style={{ ...s.summaryValue, color: '#fca5a5' }}>-{data.summary.total_spent}</p>
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>All Transactions</h2>

        {loading ? (
          <div style={s.loadingList}>{Array(5).fill(0).map((_, i) => <div key={i} style={s.skeleton} />)}</div>
        ) : (
          <div style={s.list}>
            {(data?.transactions || []).map(tx => {
              const typeStyle = txTypeStyle[tx.transaction_type] || { color: '#94a3b8', prefix: '' };
              return (
                <div key={tx.id} style={s.txRow}>
                  <div style={{ ...s.txIcon, background: tx.transaction_type === 'spent' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
                    {tx.transaction_type === 'spent' ? '⬆' : '⬇'}
                  </div>
                  <div style={s.txInfo}>
                    <div style={s.txDesc}>{tx.description}</div>
                    <div style={s.txMeta}>
                      <span className={`tag ${tx.transaction_type === 'spent' ? 'tag-red' : 'tag-green'}`} style={{ fontSize: 10 }}>
                        {txTypeLabel[tx.transaction_type] || tx.transaction_type}
                      </span>
                      {tx.related_user_name && (
                        <span style={s.txUser}>with {tx.related_user_name}</span>
                      )}
                      <span style={s.txDate}>{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...s.txAmount, color: typeStyle.color }}>
                      {typeStyle.prefix}{tx.amount}
                    </div>
                    <div style={s.txBalance}>Balance: {tx.balance_after}</div>
                  </div>
                </div>
              );
            })}
            {(!data?.transactions || data.transactions.length === 0) && (
              <div style={s.empty}>No transactions yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  title: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, marginBottom: 28 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 },
  summaryCard: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 24, textAlign: 'center' },
  summaryLabel: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  summaryValue: { fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800 },
  card: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 20, padding: 28 },
  cardTitle: { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 20 },
  list: { display: 'flex', flexDirection: 'column' },
  loadingList: { display: 'flex', flexDirection: 'column', gap: 12 },
  skeleton: { height: 64, background: 'rgba(99,102,241,0.05)', borderRadius: 10 },
  txRow: { display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(99,102,241,0.08)' },
  txIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: 500, color: '#f1f5f9', marginBottom: 4 },
  txMeta: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  txUser: { fontSize: 12, color: '#64748b' },
  txDate: { fontSize: 12, color: '#475569' },
  txAmount: { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 },
  txBalance: { fontSize: 11, color: '#475569', marginTop: 2 },
  empty: { textAlign: 'center', padding: 40, color: '#64748b', fontSize: 14 },
};