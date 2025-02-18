import express from "express";
// express라는 라이버리를 가져온다. 이 라이브러리는 우리가 웹 서버를 만들 수 있게 도와주는 도구
// 예를 들어 우리가 사람들과 대화할 수 있는 대화방을 만들고, 그 대화방에 사람들이 요청을 보내고, 서버가 응답할 수 있게 해주는 도구
import { PrismaClient } from "@prisma/client";
//prisma는 데이터베이스와 대화할 수 있게 해주는 도구. 예를들어 우리가 사람들의 이름 나이 직업 등을 저장한 목록이
// 있을 때 , prisma를 통해 이 데이터를 저장하거나 수정하거나 조회할 수 있다.
import { assert } from "superstruct";
//assert는 우리가 보낸 데이터가 올바른 형식인지 확인하는 도구. 예를들어 우리가 이메일을 보낼 때 이메일 주소 형식이 맞는지
// 체크하는 것처럼 보낸 데이터가 규칙에 맞는지 확인하는 역할을 한다.
import * as dotenv from "dotenv";
//.env 파일에 비밀 정보를 저장해두고 그정보를 코드에서 불러와서 사용하는 도구. 예를들어 비밀번호나 중요한 api 키를 코드에
// 직접 넣지 않고 안전하게 관리 할 수 있게 도와줌
import {
  CreateUser,
  PatchUser,
  CreateProduct,
  PathProduct,
  CreateOrder,
  CreateSavedProduct,
} from "./structs.js";
import cors from "cors";
import { PrismaClientValidationError } from "@prisma/client/runtime/library";

dotenv.config(); //.env  파일에 저장된 환경 변수들을 불러오는 명령이다.
const prisma = new PrismaClient(); // prisma라는 변수를 만들어서 데이터베이스와 연결하는 역할을 함
const app = express(); // express로 웹 서버를 만든다. 이 서버는 요청을 보내면 처리하고 응답을 보내주는 역할을 한다.
// 예를 들어, 웹사이트나 앱을 만들 때 서버가 있어야 그 위에서 데이터를 주고 받을 수 있다.
app.use(cors());
app.use(express.json()); // 서버가 json 형식의 데이터를 받을 수 있게 해준다.
// 예를들어 우리가  {"name":"john"}과 같은 데이터를 서버에 보낼 때, 서버가 이 데이터를 제대로 이해할 수
// 수 있도록 도와준다.

// asyncHandler 함수: 비동기 요청 핸들러에 대한 에러 처리를 제공.
function asyncHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res); // 요청 핸들러 실행
    } catch (e) {
      if (
        e.name === "StructError" ||
        (e instanceof Prisma.PrismaClientKnownRequestError && //데이터가 잘못된 형식일때 400 오류를 보내고 메시지에는 오류 내용이 담김
          e.code === "P2002") || // 이미 존재하는 데이터를 다시 저장하려고 할 때 400 오류를 보낸다
        e instanceof PrismaClientValidationError
      ) {
        res.status(400).send({ message: e.message }); // 유효성 검사 오류
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025" // id로 데이터를 찾으려고 했는데 없다면 404 오류
      ) {
        res.status(404).send({ message: e.message });
      } else {
        res.status(500).send({ message: e.message }); // 그 외 오류
      }
    }
  };
}

// 사용자 목록 조회(GET)
app.get(
  "/users",
  asyncHandler(async (req, res) => {
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
      include: {
        userPreference: {
          select: { receiveEmail: true },
        },
      },
    });
    res.send(users);
  })
);

app.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        userPreference: {
          select: {
            receiveEmail: true,
          },
        },
      },
    });
    res.send(user);
  })
);

app.post(
  "/users/:id/saved-products",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateSavedProduct);
    const { id: userId } = req.params;
    const { productId } = req.body;
    //판단로직
    const savedCount = await prisma.user.count({
      where: {
        id: userId,
        savedProducts: {
          some: { id: productId },
        },
      },
    });
    console.log("savedCount:", savedCount);
    const { savedProducts } = await prisma.user.update({
      where: { id: userId },
      data: {
        savedProducts:
          savedCount > 0
            ? { disconnect: { id: productId } }
            : { connect: { id: productId } },
      },
      include: {
        savedProducts: true,
      },
    });
    res.send(savedProducts);
  })
);

app.patch(
  "/users/:id/saved-products",
  asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    const { productId } = req.body;
    const { savedProducts } = await prisma.user.update({
      where: { id: userId },
      data: {
        savedProducts: {
          disconnect: {
            id: productId,
          },
        },
      },
      include: {
        savedProducts: true,
      },
    });
    res.send(savedProducts);
  })
);

app.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    assert(req.body, PatchUser);

    const { userPreference, ...userFields } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...userFields,
        userPreference: {
          update: userPreference,
        },
      },
      include: {
        userPreference: true,
      },
    });
    res.send(user);
  })
);

app.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id },
    });
    res.send("Success delete");
  })
);

app.get(
  "/users/:id/orders",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { orders } = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        orders: true,
      },
    });
    res.send(orders);
  })
);

app.get(
  "/users/:id/saved-products",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { savedProducts } = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        savedProducts: true,
      },
    });
    res.send(savedProducts);
  })
);

app.get(
  "/products",
  asyncHandler(async (req, res) => {
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
  })
);

app.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });
    console.log(product);
    res.send(product);
  })
);

app.post(
  "/products",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateProduct);
    const product = await prisma.product.create({ data: req.body });
    res.send(product);
  })
);

app.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    assert(req.body, PathProduct);
    const product = await prisma.product.update({
      where: { id },
      data: req.body,
    });

    res.send(product);
  })
);

app.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id },
    });
    res.sendStatus(204);
  })
);

app.post(
  "/orders",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateOrder); // 요청 바디가 createorder 타입인지 확인
    const { userId, orderItems } = req.body; // 요청 본문에서 userId와 orderItems를 추출하는 코드

    //1. get products
    const productIds = orderItems.map((orderItem) => orderItem.productId);
    // 사용자가 주문한 상품들의 productId만 뽑아서 배열에 저장
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    }); // 상품 ID를 기준으로 데이터베이스에서 해당 상품들의 정보를 가져오는 코드
    //ProductIds 배열에 있는 ID에 해당하는 상품들을 모두 찾아서 products 변수에 저장

    function getQuantity(productId) {
      // 주문 아이템 중에서 특정 productId에 해당하는
      const { quantity } = orderItems.find(
        //상품의 수량 (quantity)을 찾아서 반환하는 함수
        (orderItem) => orderItem.productId === productId
      );
      return quantity;
    }
    //2. 재고와 주문량 비교
    const isSuffcientStock = products.every((product) => {
      const { id, stock } = product;
      return stock >= getQuantity(id);
    });
    //3. error or create order
    if (!isSuffcientStock) {
      throw new Error("Insufficient Stock");
    }
    //Quiz: 실제 상품의 재고량을 감소시키는 로직 추가
    //for (const productId of productIds) {
    //  await prisma.product.update({
    //    where: { id: productId },
    //    data: {
    //      stock: {
    //        decrement: getQuantity(productId),
    //      },
    //    },
    //  });
    // }

    //await 안해서 pending 상태임
    const queries = productIds.map((productId) => {
      return prisma.product.update({
        where: { id: productId },
        data: {
          stock: {
            decrement: getQuantity(productId),
          },
        },
      });
    });

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          user: {
            connect: { id: userId },
          },
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: true,
        },
      }),
      ...queries,
    ]);

    res.status(201).send(order);
  })
);

app.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        orderItems: true,
      },
    });
    let total = 0;
    order.orderItems.forEach(({ unitPrice, quantity }) => {
      total += unitPrice * quantity;
    });

    //const total = order.order.orderItems.reduce((acc, { unitPrice, quantitiy})=>{
    //return acc + unitPrice * quantitiyl},0);

    order.total = total;
    res.send(order);
  })
);

app.listen(process.env.PORT || 3000, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
