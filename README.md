# E‑Commerce Backend

## Project Description
Secure REST API for a modern e‑commerce app. Handles products, categories, orders, cart, wishlist, users, and authentication. Supports customer and admin roles, order lifecycle, email verification, password reset, rate limiting, and secure headers.

## Technology Stack
- Runtime: Node.js 20+
- Framework: Express 5
- Database: MongoDB (Mongoose 8)
- Validation: Zod
- File Upload: Multer (local or Cloudinary)
- Auth: JWT
- Security: Helmet, CORS, Rate Limiting
- Mail: Nodemailer (SMTP)
- Utilities: dotenv, bcryptjs

## Installation
```bash
# clone
git clone <repo-url>
cd ecommerce-backend

# install
npm install

# copy env
cp .env.example .env
```

Example `.env`:
```env
# HTTP
PORT=8080
CORS_ORIGINS=http://localhost:3000

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce

# Auth
JWT_SECRET=change_me

# SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=app_password

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Seed database (sample categories, products, demo users):
```bash
npm run seed
```

## Running
```bash
# Development
npm run dev
# API: http://localhost:8080
```

## Demo Credentials
- Admin: alper@test.com / 123456
- Customer: alper@testt.com / 123456

## API Documentation (prefix: `/api/v1`)

### Auth
```http
POST   /auth/register                       # register user
POST   /auth/login                          # login, returns token
GET    /auth/me                             # current user (Bearer)
PATCH  /auth/me                             # update profile (Bearer)
GET    /auth/verify-email                   # verify link callback
POST   /auth/request-email-verification     # send verify email (Bearer)
POST   /auth/request-password-reset         # request reset email
POST   /auth/reset-password                 # reset password
```

### Categories
```http
GET    /categories                          # list
POST   /categories                          # create (admin)
PATCH  /categories/:id                      # update (admin)
DELETE /categories/:id                      # delete (admin)
```

### Products (core)
```http
GET    /products                            # list (q, category, min, max, sort, page, limit)
GET    /products/:slugOrId                  # detail (by slug or id)
POST   /products                            # create (admin, multipart field: image)
PATCH  /products/:id                        # update (admin, multipart field: image)
DELETE /products/:id                        # delete (admin)
```

### Product Recommendations & Activity
```http
GET    /products/popular                                  # popular products
GET    /products/:id/related                              # related products
POST   /products/:id/view                                 # track view (auth)
GET    /products/recently-viewed                          # user’s recently viewed (auth)
GET    /products/:id/frequently-bought-together           # FBT suggestions
```

### Cart
```http
GET    /cart                                             # get my cart (auth)
POST   /cart/items                                       # add item (auth)
PATCH  /cart/items/:productId                            # update qty (auth)
DELETE /cart/items/:productId                            # remove item (auth)
POST   /cart/checkout                                    # checkout (auth)
```

### Orders
```http
POST   /orders                                           # create (auth)
GET    /orders                                           # my orders (auth)
GET    /orders/:id                                       # order detail (auth)
GET    /orders/admin/list                                # admin list (admin)
PATCH  /orders/:id/status                                # update status (admin)
```

### Wishlist
```http
GET    /wishlist                                         # list (auth)
POST   /wishlist                                         # add (auth)
DELETE /wishlist                                         # remove (auth) { productId }
```

### Static Uploads
Uploaded files (if using local disk) are served at:
```http
GET /uploads/<filename>
```

## Deployment
```bash
# build & start
npm ci
npm run build
npm start
```
- Set `CORS_ORIGINS` to your frontend domain (comma‑separated for multiple origins)
- Put this behind a reverse proxy (e.g., Nginx) and enable HTTPS
- Use strong `JWT_SECRET` and secure SMTP credentials in production

## Features
- JWT auth with role‑based access (customer/admin)
- Email verification & password reset
- Product, category, order, cart, wishlist endpoints
- Admin order status workflow (pending → confirmed → shipped → delivered/cancelled)
- Image upload (local or Cloudinary)
- Security hardening (Helmet, CORS, rate limits)
- Seed data for quick start
- AI Chat
