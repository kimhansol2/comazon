import express from "express";
import { PrismaClient } from "@prisma/client"; //prisma는 데이터베이스와 연결해 데이터를 쉽게 조회하거나 수정할 수 있도록
import { assert } from "superstruct";
import * as dotenv from "dotenv"; //.env 파일에 있는 환경 변수들을 불러온다. (비밀정보를 관리하는 도구)
import {
  CreateUser,
  PatchUser,
  CreateProduct,
  PathProduct,
} from "./structs.js";

dotenv.config(); //.env 파일에 저장된 환경 변수를 로드한다.
const prisma = new PrismaClient(); // prisma 클라이언트 초기화
const app = express(); // 서버 만들기
app.use(express.json()); // 서버가 json 형식의 데이터를 받을 수 있게 해준다.

function asyncHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (e) {
      if (e.name === "StructError") {
        res.status(400).send({ message: e.message });
      } else {
        res.status(500).send({ message: e.message });
      }
    }
  };
}

app.get("/users", async (req, res) => {
  const { offset = 0, limit = 10, order = "newest" } = req.query;
  let orderBy;
  switch (order) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
    default:
      orderBy = { createdAt: "desc" };
  }
  const users = await prisma.user.findMany({
    orderBy,
    skip: parseInt(offset),
    take: parseInt(limit),
  });
  res.send(users);
});

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
  });
  res.send(user);
});

app.post("/users", async (req, res) => {
  assert(req.body, CreateUser);
  const user = await prisma.user.create({ data: req.body });
  res.status(201).send(user);
});

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  assert(req.body, PatchUser);
  const user = await prisma.user.update({
    where: { id },
    data: req.body,
  });
  res.send(user);
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({
    where: { id },
  });
  res.send("Success delete");
});

app.get("/products", async (req, res) => {
  const { offset, limit, order = "newest", category } = req.query;
  let orderBy;
  switch (order) {
    case "priceLowest":
      orderBy = { price: "asc" };
      break;
    case "priceHighest":
      orderBy = { price: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
    default:
      orderBy = { createdAt: "desc" };
  }
  const where = category ? { category } : {};
  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: parseInt(offset) || 0,
    take: parseInt(limit) || 10,
  });
  console.log(products);
  res.send(products);
});

app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({
    where: { id },
  });
  console.log(product);
  res.send(product);
});

app.post("/products", async (req, res) => {
  assert(req.body, CreateProduct);
  const product = await prisma.product.create({ data: req.body });
  res.send(product);
});

app.patch("/products/:id", async (req, res) => {
  const { id } = req.params;
  assert(req.body, PathProduct);
  const product = await prisma.product.update({
    where: { id },
    data: req.body,
  });

  res.send(product);
});

app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.product.delete({
    where: { id },
  });
  res.sendStatus(204);
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
