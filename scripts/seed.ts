import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Category from "../src/models/Category";
import Product from "../src/models/Product";
import User from "../src/models/User";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  console.log("✅ Connected");

  // Temiz başlangıç
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({})
  ]);

  // 8 ana kategori
  const categoriesData = [
    { name: "Electronics", slug: "electronics", description: "Phones, laptops, accessories" },
    { name: "Clothing", slug: "clothing", description: "Men & Women apparel" },
    { name: "Home and Garden", slug: "home-garden", description: "Furniture & decor" },
    { name: "Sports", slug: "sports", description: "Fitness & outdoor" },
    { name: "Books", slug: "books", description: "Books & magazines" },
    { name: "Health and Beauty", slug: "health-beauty", description: "Cosmetics & care" },
    { name: "Toys", slug: "toys", description: "Kids & hobby" },
    { name: "Food", slug: "food", description: "Grocery & gourmet" }
  ];
  const categories = await Category.insertMany(categoriesData);
  const bySlug: Record<string, any> = {};
  for (const c of categories) bySlug[c.slug] = c._id;

  // Örnek ürünler (12 adet)
  const productsData = [
    { name: "Laptop Pro 14", slug: "laptop-pro-14", price: 1499, categoryId: bySlug["electronics"], images: [], tags: ["laptop","pro"], featured: true },
    { name: "Wireless Earbuds", slug: "wireless-earbuds", price: 129, categoryId: bySlug["electronics"], images: [], tags: ["audio"] },
    { name: "Running Shoes", slug: "running-shoes", price: 89, categoryId: bySlug["sports"], images: [], tags: ["shoes"] },
    { name: "Yoga Mat", slug: "yoga-mat", price: 25, categoryId: bySlug["sports"], images: [], tags: ["fitness"] },
    { name: "Cotton T-Shirt", slug: "cotton-tshirt", price: 19, categoryId: bySlug["clothing"], images: [], tags: ["tshirt"] },
    { name: "Denim Jacket", slug: "denim-jacket", price: 79, categoryId: bySlug["clothing"], images: [], tags: ["jacket"], featured: true },
    { name: "Modern Lamp", slug: "modern-lamp", price: 45, categoryId: bySlug["home-garden"], images: [], tags: ["lamp"] },
    { name: "Coffee Table", slug: "coffee-table", price: 159, categoryId: bySlug["home-garden"], images: [], tags: ["table"] },
    { name: "Novel: The Journey", slug: "novel-the-journey", price: 14, categoryId: bySlug["books"], images: [], tags: ["novel"] },
    { name: "Cookbook Essentials", slug: "cookbook-essentials", price: 22, categoryId: bySlug["books"], images: [], tags: ["cookbook"] },
    { name: "Face Serum", slug: "face-serum", price: 35, categoryId: bySlug["health-beauty"], images: [], tags: ["serum"] },
    { name: "Wooden Puzzle", slug: "wooden-puzzle", price: 18, categoryId: bySlug["toys"], images: [], tags: ["puzzle"] }
  ];
  await Product.insertMany(productsData);

  // Demo kullanıcılar
  const adminPass = await bcrypt.hash("Admin123!", 10);
  const userPass = await bcrypt.hash("User123!", 10);
  await User.insertMany([
    { email: "admin@demo.com", passwordHash: adminPass, role: "admin", firstName: "Admin" },
    { email: "user@demo.com",  passwordHash: userPass,  role: "customer", firstName: "User"  }
  ]);

  console.log("🌱 Seed completed");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});