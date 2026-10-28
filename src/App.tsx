import { useEffect, useState, useCallback } from 'react';
import { fetchTrainData } from './api';
import type { AppData } from './types';
import './App.css';

type Status = 'loading' | 'success' | 'error';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const result = await fetchTrainData();
      setData(result);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Onbekende fout');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasAnyIssue =
    data &&
    (data.disruptions.length > 0 ||
      data.departures.some((d) => d.cancelled || d.delayMinutes > 2));

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="route">
          <span className="station from">Utrecht C.</span>
          <span className="arrow" aria-hidden="true">→</span>
          <span className="station to">Amsterdam C.</span>
        </div>
        <div className="window-label">08:00 – 09:00</div>
      </header>

      {/* Content */}
      <main className="main">
        {status === 'loading' && (
          <div className="state-center" aria-live="polite" aria-label="Laden">
            <div className="spinner" aria-hidden="true" />
            <p className="state-text">Actuele info ophalen…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-center" aria-live="assertive">
            <div className="error-icon" aria-hidden="true">!</div>
            <p className="state-text">Kon geen verbinding maken</p>
            <p className="error-detail">{errorMsg}</p>
            <button className="retry-btn" onClick={load} id="retry-button">
              Opnieuw proberen
            </button>
          </div>
        )}

        {status === 'success' && data && (
          <>
            <div className="date-bar">
              <span className="date-label">{data.targetDate}</span>
              <span className="fetched-at">
                Bijgewerkt: {data.fetchedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Disruptions */}
            {data.disruptions.length > 0 && (
              <section className="section" aria-labelledby="disruptions-heading">
                <h2 className="section-heading" id="disruptions-heading">
                  <span className="section-icon" aria-hidden="true">⚠</span>
                  Storingen &amp; Werkzaamheden
                </h2>
                <ul className="disruption-list" role="list">
                  {data.disruptions.map((d) => (
                    <li key={d.id} className={`disruption-item ${d.type === 'MAINTENANCE' ? 'maintenance' : 'disruption'}`}>
                      <span className="disruption-badge">
                        {d.type === 'MAINTENANCE' ? 'Werkzaamheden' : 'Storing'}
                      </span>
                      <span className="disruption-title">{d.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Departures */}
            {data.departures.length === 0 ? (
              <div className="empty-state">
                <p className="empty-text">Geen treinen gevonden in dit tijdvak</p>
                <p className="empty-sub">Mogelijk zijn er nog geen gegevens beschikbaar voor morgenochtend.</p>
              </div>
            ) : (
              <section className="section" aria-labelledby="departures-heading">
                <h2 className="section-heading" id="departures-heading">
                  <span className="section-icon" aria-hidden="true">🚆</span>
                  Vertrekken
                </h2>

                {!hasAnyIssue && (
                  <div className="all-good" role="status">
                    <span className="all-good-icon" aria-hidden="true">✓</span>
                    Geen afwijkingen bekend
                  </div>
                )}

                <ul className="departure-list" role="list">
                  {data.departures.map((dep, i) => {
                    const hasDelay = dep.delayMinutes > 2;
                    const status = dep.cancelled ? 'cancelled' : hasDelay ? 'delayed' : 'on-time';
                    return (
                      <li
                        key={i}
                        className={`departure-item ${status}`}
                        aria-label={`${dep.plannedTime}${dep.cancelled ? ', uitgevallen' : hasDelay ? `, ${dep.delayMinutes} minuten vertraging` : ', op tijd'}`}
                      >
                        <div className="dep-left">
                          <span className="dep-planned">{dep.plannedTime}</span>
                          {(hasDelay || dep.cancelled) && (
                            <span className="dep-actual" aria-label="Verwachte vertrektijd">
                              {dep.cancelled ? 'Rijdt niet' : dep.actualTime}
                            </span>
                          )}
                          <span className="dep-type">{dep.trainType}</span>
                        </div>
                        <div className="dep-right">
                          {dep.cancelled ? (
                            <span className="badge cancelled">Uitgevallen</span>
                          ) : hasDelay ? (
                            <span className="badge delayed">+{dep.delayMinutes} min</span>
                          ) : (
                            <span className="badge on-time">Op tijd</span>
                          )}
                          <span className="dep-track" aria-label={`Spoor ${dep.track}`}>
                            <span className="track-label">Sp.</span>
                            {dep.track}
                          </span>
                        </div>
                        {dep.messages.length > 0 && (
                          <ul className="dep-messages" role="list">
                            {dep.messages.map((msg, j) => (
                              <li key={j} className="dep-message">{msg}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer refresh button */}
      {status === 'success' && (
        <footer className="footer">
          <button
            className="refresh-btn"
            onClick={load}
            id="refresh-button"
            aria-label="Ververs de treininfo"
          >
            ↺ Ververs
          </button>
        </footer>
      )}
    </div>
  );
}
