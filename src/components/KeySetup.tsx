import { useState } from 'react';
import { saveKey } from '../game/streetview';

interface Props {
  /** Set when a saved key was rejected, so we can say so plainly. */
  rejected?: boolean;
  onSaved: (key: string) => void;
  onBack: () => void;
}

const CONSOLE_URL = 'https://console.cloud.google.com/google/maps-apis/credentials';

export default function KeySetup({ rejected, onSaved, onBack }: Props) {
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    saveKey(key);
    onSaved(key);
  };

  return (
    <div className="screen screen--center">
      <div className="panel">
        <button className="linkback" onClick={onBack}>
          &larr; Menu
        </button>

        <h2 className="panel__title">One-time setup: a Google Maps key</h2>

        {rejected && (
          <p className="alert">
            Google rejected the saved key. It may be restricted to another site, or the Maps
            JavaScript API may not be enabled on the project.
          </p>
        )}

        <p className="muted">
          The panoramas come from Google Street View, which only serves requests carrying an API
          key. The key stays in this browser's local storage — it is never sent anywhere except
          Google, and it is not in the repository.
        </p>

        <ol className="steps">
          <li>
            Open the <a href={CONSOLE_URL} target="_blank" rel="noreferrer">Google Maps Platform credentials page</a> and create an API key.
          </li>
          <li>
            Enable <strong>Maps JavaScript API</strong> and <strong>Street View Static API</strong> on the same project.
          </li>
          <li>Paste the key below.</li>
        </ol>

        <form onSubmit={submit} className="keyform">
          <input
            className="input"
            placeholder="AIza…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn--primary" type="submit" disabled={!value.trim()}>
            Save and play
          </button>
        </form>

        <p className="muted small">
          Restrict the key to your own domain in the Google console before deploying publicly —
          an unrestricted key in a public site can be used by anyone and billed to you.
        </p>
      </div>
    </div>
  );
}
