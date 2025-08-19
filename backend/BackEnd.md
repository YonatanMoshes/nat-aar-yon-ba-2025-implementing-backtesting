```mermaid
flowchart LR
  subgraph HTTP
    FE[React SPA] -- axios/fetch --> ROUTES
  end

  subgraph Express-Layer
    ROUTES --> CTRL[Controllers]
    CTRL   --> SVC[Services]
    SVC    --> MDB[(MongoDB → Mongoose Models)]
    SVC    --> FS[(Disk contents/FS)]
  end

  SVC -- throws --> ERR[ErrorHandling.js]
  CTRL -- res.json / status --> FE
  FE   -- JWT Bearer --> ROUTES
```

## Routes → Controllers → Services → Models → ErrorHandling
- **Routes**: glue path + verb → controller method  
- **Controllers**: stateless, orchestrate one service call, translate errors → HTTP  
- **Services**: business logic / joins / token sign; no `req`/`res`  
- **Models**: Mongoose schemas (dynamic per-stock)  
- **ErrorHandling**: guarantees JSON `{ error: msg }` for all uncaught throws  

---

## 1 · Technology Stack & Theory

| Layer   | Library / Pattern            | Why Chosen                                                     |
|---------|------------------------------|----------------------------------------------------------------|
| HTTP    | Express 5                    | Minimal middleware graph; full TypeScript defs if needed       |
| Data    | Mongoose over MongoDB        | Schema validation at server edge; dynamic collections          |
| Auth    | jsonwebtoken (HS256)         | Stateless; fits simple single-server deployment                |
| Images  | `fs.readFileSync` fallback   | Avoid 404 avatars; constant-time path resolution               |
| Dates   | ISO 8601 strings in DB       | No tz headaches; matches Python ETL export                     |
| Error   | Domain errors `{statusCode,msg}` | Services can raise layered errors; filter sanitises        |

2 · The Express Entry-Point
app.js

```js

const express = require('express');              // ① HTTP framework
const cors    = require('cors');                 // ② Cross-origin for React
const errorMW = require('./ErrorHandling');      // ③ Final error responder
...
app.use('/api/users',  require('./routes/user'));   // ④ MVC routers
app.use('/api/tokens', require('./routes/token'));
app.use('/api/prices', require('./routes/prices'));
...
app.use(errorMW.expressCatchAll);                // ⑤ JSON `{ error }` fallback
```
Pattern: Front Controller—single boot file wires cross-cutting concerns then hands off.

 (Mongoose)
 models/user.js – Identity & Profile
```mermaid

classDiagram
  class User {
    +String username*
    +String password*
    +String email*
    +String phone*
    +String location*
    +Boolean hasInvested = false
    +Boolean isAdmin     = false
    +[ObjectId] stockInvested
  }
```


3.2 OHLC / Binary / PCT Dynamic Models
```js

// Generic factory (models/ohlc.js)
const schema = new mongoose.Schema({ /* open, high, low, close, volume, timestamp */ });
module.exports.getXModel = (coll) =>
  mongoose.models[coll] || mongoose.model(coll, schema, coll);
```
```mermaid

erDiagram
  OHLC_KRWT ||--|| PCT_KRWT   : "by timestamp"
  OHLC_KRWT ||--|| BINARY_KRWT: "by timestamp"
```
Pattern: Dynamic-collection allows new stocks (e.g. AAPL) with zero code changes.

 Services — Business Logic Brains
 services/user.js
Function	Algorithm

Instantiate & validate via Mongoose

save() → promise |

Validation and domain rules bubble errors as {statusCode,msg} for central handling.

4.2 services/token.js
```js

const jwt = require('jsonwebtoken');
exports.authenticateUser = async (u, pw) => {
  const user = await userSvc.getUserByName(u);
  if (!user || user.password !== pw) return null;
  return {
    userId: user._id,
    token: jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      secret,
      { expiresIn: '12h', algorithm: 'HS256' }
    ),
    isAdmin: user.isAdmin
  };
};
```
Stateless auth: no DB roundtrip after sign

12h expiry: balances usability with security

services/prices.js – Multi-Collection Join
```mermaid
flowchart TD
  subgraph fetchPrices
    A["resolve model names"] --> B["query OHLC_*"]
    A --> C["query BINARY_*"]
    A --> D["query PCT_*"]
    B & C & D --> E["merge into Map(timestamp)"]
    E --> F["sort chronologically"]
    F --> G["return array of merged records"]
  end
```
Performance:

Use .select() to fetch only needed fields

Merge via Map for O(N) complexity

 services/content.js – Avatar Resolver
IF user.picture empty
  → read /contents/users/default/default.png
ELSE
  ext = path.extname(...)
  → read /contents/users/<username>.<ext>
RETURN { file, contentType }
Guarantees UI <img> never 404’s; fallback served in constant time.

Controllers — Thin Orchestration
 controllers/user.js
```mermaid
sequenceDiagram
  participant FE
  participant Ctrl
  participant Svc as userService
  FE->>Ctrl: createUser(req)
  Ctrl->>Svc: createUser(data)
  Svc-->>Ctrl: userDoc
  Ctrl-->>FE: 201 + Location header
```
```js
try {
  const payload = await serviceCall();
  res.status(201).json(payload);
} catch (err) {
  res.status(err.statusCode||500).json({ error: err.message });
}
```
Controllers translate service results into HTTP responses, no business logic.

Routes — HTTP Grammar
```mermaid

flowchart TD
  users["POST /api/users"]           --> ctrlUser.createUser
  users_id["GET /api/users/:id"]     --> ctrlUser.getUser
  tokens["POST /api/tokens"]         --> ctrlToken.authenticate
  prices["POST /api/prices"]         --> ctrlPrices.fetch
  pricesRange["POST /api/prices/date-range"] --> ctrlPrices.range
```
Rule: Routes only string-match & param-extract; never transform business data.

Error Handling
ErrorHandling.js

```js

exports.filterError = (err) => {
  if (!err.statusCode) err = { statusCode: 500, message: 'Server Error' };
  throw err;  // bubble to expressCatchAll
};

exports.expressCatchAll = (err, req, res, _) =>
  res.status(err.statusCode || 500).json({ error: err.message });
```
Guarantees all error responses are JSON shape {error:string}; no stack leaks.

Token Verifier (Future-Proof)
```js

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
```
Mount on /admin/* routes to secure endpoints.

Full Request Sequences
 Sign-Up then Login
```mermaid

sequenceDiagram
  FE->>POST /api/users: {username,email,...}
  POST /api/users->>UserSvc: createUser()
  UserSvc->>Mongo: INSERT
  Mongo-->>UserSvc: _id
  UserSvc-->>POST /api/users: doc
  POST /api/users-->>FE: 201 /api/users/603...

  FE->>POST /api/tokens: {username,pwd}
  POST /api/tokens->>TokenSvc: authenticateUser()
  TokenSvc->>Mongo: User.findOne
  Mongo-->>TokenSvc: doc
  TokenSvc-->>POST /api/tokens: {token,userId,isAdmin}
  POST /api/tokens-->>FE: 200 JSON
  FE->>LocalStorage: save token
```

InteractiveGraph Data Fetch

```mermaid
sequenceDiagram
  participant IG as React_InteractiveGraph
  participant API as POST_/api/prices
  participant PS as PricesSvc
  participant MDB as MongoDB
  participant CV as Canvas

  IG->>API: { start, end, stock='BTC' }
  API->>PS: fetchPrices(start, end, stock)
  PS->>MDB: find on ohlc_BTC
  PS->>MDB: find on binary_BTC
  PS->>MDB: find on pct_BTC
  MDB-->>PS: docs[]
  PS-->>API: [{ merged… }]
  API-->>IG: payload
  IG-->>CV: drawCandlestickChart()
```
UI down-samples locally if > MAX_CANDLES; server remains agnostic.

## Data Down-Sampling
- UI down-samples locally if `> MAX_CANDLES`; server remains agnostic.

---

## Front-End Coupling Points

| Component             | API Endpoint                      | Data Fields Consumed                                                      |
|-----------------------|-----------------------------------|----------------------------------------------------------------------------|
| **LoginForm**         | `POST /api/tokens`                | `{ token, userId, isAdmin }`                                              |
| **SignUpForm**        | `POST /api/users`                 | Returns `201` + Location header on success                                 |
| **InteractiveGraph**  | `POST /api/prices`                | `open, high, low, close, volume, binary_predictions, pct_prediction`       |
| **Date-picker**       | `POST /api/prices/date-range`     | `{ start, end }`                                                           |
| **Avatar `<img>`**    | `/api/contents/:username`         | Binary PNG / JPEG                                                          |

---

## Security & Future Work
- **Password hashing**: Switch to `bcrypt.hash(pwd, 12)` in `services/user.js`
- **HTTPS termination**: via Nginx; Express listens on `localhost` only
- **Rate limiting**: Mount `express-rate-limit` before `/api/prices`
- **Unit tests**: Use `mongodb-memory-server` to stub Mongoose; test services in isolation

---

## File-by-File Cheat Sheet

| Path                     | Responsibility                           | Major Exports                                            |
|--------------------------|------------------------------------------|----------------------------------------------------------|
| `controllers/user.js`    | HTTP ↔ userService glue                  | `createUser`, `getUser`                                  |
| `controllers/token.js`   | Login endpoint                           | `authenticateUser`                                       |
| `controllers/prices.js`  | OHLC + prediction join                   | `fetchPricesAndPredictions`, `fetchMinMaxDates`          |
| `services/user.js`       | CRUD + ID generation                     | `createUser`, `getUserBy*`                               |
| `services/token.js`      | JWT sign/verify                          | `authenticateUser`                                       |
| `services/prices.js`     | DB queries & merge logic                 | `fetchPrices`, `fetchMinMaxDates`                        |
| `services/content.js`    | Avatar stream                            | `getUserFiles`                                           |
| `routes/user.js`         | `/api/users` mapping                     | POST, GET `/:id`                                         |
| `routes/token.js`        | `/api/tokens` mapping                    | POST                                                     |
| `routes/prices.js`       | `/api/prices` mapping                    | POST, POST `/date-range`                                 |
| `models/*`               | Mongoose schemas & dynamic factories     | Factory functions & `User` schema                        |

---

## Glossary
- **MVC**: Routes = View mapping; Controllers = Controller; Services + Models = Model & Domain  
- **HS256**: HMAC-SHA256 symmetric JWT algorithm  
- **Dynamic collection**: Model factory pattern returning `mongoose.model(name, schema, name)`  
- **Down-sampling**: Client-side reduction of candles for FPS—no server change  
