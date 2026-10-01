# Udhaari

Udhaari is a private, offline-first Android and web ledger for personal lending and borrowing. It keeps person-wise balances and a permanent transaction history on the device.

## What it tracks

- Money you gave, money you took, repayments received, and repayments made
- Person-wise amounts to receive or pay
- Transaction date, optional due date, category, and detailed notes
- Partial repayments and one-tap full settlement
- Open overdue balances with oldest-debt-first repayment allocation
- Search and filters for people and complete history
- JSON backup/restore and CSV spreadsheet export
- Automatic migration of records from the original browser version

No account or internet connection is required. Data is stored in the app's private local storage. Uninstalling the app or clearing its data removes the ledger, so make regular JSON backups.

## Run the web app

Open `index.html` directly, or run:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Build and test

Requirements: Node.js 22, JDK 21, and Android SDK 36.

```bash
npm install
npm test
npm run android:apk
```

The debug APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Privacy

Records do not leave the device unless you explicitly share a backup or CSV file. The APK requests no internet, contacts, camera, microphone, location, or storage permission.
