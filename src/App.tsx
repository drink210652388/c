/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Calendar} from './components/Calendar';
import {usePWAInstall} from './hooks/usePWAInstall';

export default function App() {
  const {canInstall, promptInstall} = usePWAInstall();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-stone-100">
      {canInstall ? (
        <button
          type="button"
          onClick={() => {
            void promptInstall();
          }}
          className="absolute right-4 top-4 z-10 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Install App
        </button>
      ) : null}
      <Calendar />
    </div>
  );
}
