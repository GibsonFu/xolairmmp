# Xolair MMP 填寫紀錄彙整網站

業代依「業代碼」登入，填寫每位 HCP 的 MMP 紀錄；管理者（Gibson / Sandy / Tim）可檢視全部業代的彙整資料並匯出 Excel。

## 帳號說明

- 一般業代帳號：12 組業代碼（SC11、SC12、SC13、SC21、SC22、SC31、SC32、SC33、SC41、SC42、SC43、SC44），對應 `Xolair 客戶清單檢查.xlsx` 內的業代碼。
- 最高權限帳號：`Gibson`、`Sandy`、`Tim`，可檢視全部業代資料並匯出。
- 所有帳號預設密碼皆為 `0000`，**第一次登入會強制要求設定新密碼**（不可沿用 0000）。

## 專案結構

- `server.js` — Express 主程式、session 設定、路由掛載
- `db/schema.sql` — 資料庫結構（users / psrs / customers / records / options）
- `db/seed.js` — 建表 + 匯入 `seed_data.json`（業代與客戶主檔）+ 建立登入帳號，可重複執行（不會產生重複資料）
- `seed_data.json` — 從 `Xolair 客戶清單檢查.xlsx` 匯出的業代與客戶/HCP 主檔（若原始 Excel 更新，重新執行 `scripts/` 內對應的匯出流程後，再跑一次 `npm run seed` 即可更新）
- `routes/auth.js` — 登入、變更密碼、登出
- `routes/records.js` — 業代填寫/查看自己的客戶清單與紀錄表單
- `routes/admin.js` — 管理者彙整檢視、篩選、匯出 Excel
- `views/`、`public/` — 前端頁面與樣式

MMP 表單欄位對應原始 `Xolair MMP .xls` 範本：Team、PSR、Customer、Customer Tier、HCP、科別、職稱、HCP Tier、Customer Relationship（下拉：陌生/認識/熟識）、Adoption Ladder（下拉：未接觸/試用/採用/倡導）、月病人量、Current Status（下拉：活躍/觀察/休眠/結案）、Severe asthma P't %／自動換算人數、Xolair P't %／自動換算人數、Competitor Tracking（Dupixent/Fasenra/Nucala/Tezspire 病人數）、competitor activity、nurse support、Key barriers、Objectives、monthly call No、Action Plan。

> 下拉選單的選項目前是預設建議值，都存在資料庫的 `options` 表裡，之後要調整只需要改資料庫內容，不需要改程式碼。

### 每月紀錄

紀錄是「每個客戶／HCP × 每個月」各一筆，業代與管理者頁面上方都有月份選單。選到還沒填過的月份時，系統會自動帶入該客戶最近一次填寫過的資料當草稿，業代只要確認、修改有變動的欄位再儲存，就會建立當月的新紀錄，不會覆蓋之前月份存好的資料。管理者的彙整總表與 Excel 匯出也都是依選定的月份篩選。

## 本機測試（需要本機或遠端 PostgreSQL）

```bash
npm install
cp .env.example .env   # 編輯 .env，填入你的 DATABASE_URL 與 SESSION_SECRET
npm run seed            # 建表並匯入資料、建立登入帳號
npm start                # 預設監聽 http://localhost:3000
```

## 部署到 Render（雲端，業代到處都能連線填寫）

以下帳號註冊、綁定、按下部署鍵等需要登入的步驟，請你自己操作；我可以在旁邊逐步說明。

1. **把程式碼放到 GitHub**
   - 到 https://github.com/new 建立一個新的 repository（可設為 Private）。
   - 在這個專案資料夾內執行：
     ```bash
     git init
     git add .
     git commit -m "Initial commit: Xolair MMP 紀錄彙整網站"
     git branch -M main
     git remote add origin <你的 GitHub repo 網址>
     git push -u origin main
     ```

2. **註冊 / 登入 Render**
   - 到 https://render.com 用你的 email 或 GitHub 帳號註冊登入。

3. **用 Blueprint 一次建立網站 + 資料庫**
   - 在 Render 後台點選 **New +** → **Blueprint**。
   - 選擇並授權剛剛推上去的 GitHub repository，Render 會自動讀取專案內的 `render.yaml`。
   - 它會同時建立：
     - 一個 Web Service（跑 `npm install` → `node db/seed.js` → `npm start`）
     - 一個免費方案的 PostgreSQL 資料庫，並自動把連線字串注入 Web Service 的 `DATABASE_URL`
     - 自動產生一組隨機的 `SESSION_SECRET`
   - 確認方案（Free）後按下 **Apply** 開始部署。

4. **等待部署完成**
   - 每次啟動時，`startCommand` 會先執行 `node db/seed.js` 自動建表並匯入業代/客戶資料、建立好 12 組業代帳號與 Gibson/Sandy/Tim 管理帳號，才啟動網站（Render 免費方案不支援 preDeployCommand，所以併入啟動指令，seed 是可重複執行的，不會產生重複資料）。
   - 部署完成後 Render 會給你一個網址，例如 `https://xolairmmp.onrender.com`，把這個網址分享給業代同仁即可。

5. **測試登入**
   - 用任一業代碼（例如 `SC11`）+ 密碼 `0000` 登入，確認會被要求設定新密碼。
   - 用 `Gibson` / `Sandy` / `Tim` + 密碼 `0000` 登入，確認能看到彙整總表並能匯出 Excel。

### 免費方案的限制

Render 免費方案的 Web Service 閒置一段時間會休眠，下次有人訪問時需要幾十秒喚醒；免費 PostgreSQL 有效期限制（通常 90 天後需要手動延續或升級付費方案），資料不會遺失但要記得在到期前處理，避免資料庫被停用。若之後業代同仁使用量變大或需要更穩定的即時回應，可以在 Render 後台把方案升級成付費層級。

## 之後要更新客戶/HCP 主檔

1. 更新 `Xolair 客戶清單檢查.xlsx`。
2. 重新產生 `seed_data.json`（讀取該 Excel 並輸出 JSON，欄位需為 `psrs: [{code, name}]` 與 `customers: [{specialty, tiering, psr_code, psr_name, customer_code, customer_name, contact_name, department, title}]`）。
3. 提交並推送到 GitHub，Render 會自動重新部署，啟動時會重新執行 `node db/seed.js`（既有的填寫紀錄不會被覆蓋，只有主檔會更新/新增）。
