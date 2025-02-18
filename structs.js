import * as s from "superstruct"; //데이터가 잘못되지 않았느지 체크하는 도구(검증)
import isEmail from "is-email"; //이메일 주소가 맞는지 확인하는 도구
import isUuid from "is-uuid";

const Uuid = s.define("Uuid", (value) => isUuid.v4(value));

export const CreateUser = s.object({
  email: s.define("Email", isEmail), //isEmail 이메일인지 검사하는 함수
  firstName: s.size(s.string(), 1, 30), // 이름이 1글자 이상 30글자 이하
  lastName: s.size(s.string(), 1, 30), // 성은 1글자 이상 30글자 이하
  address: s.string(), //주소는 글자들로만 이루어진 문자열
  userPreference: s.object({
    receiveEmail: s.boolean(),
  }),
});

export const PatchUser = s.partial(CreateUser); //createuser에 있는 항목들 중 일부만 바꾸고 싶을 때 사용

const category = [
  "FASHION",
  "BEAUTY",
  "SPORTS",
  "ELECTRONICS",
  "HOME_INTERIOR",
  "HOUSEHOLD_SUPPLIES",
  "KITCHENWARE",
];

export const CreateProduct = s.object({
  name: s.size(s.string(), 1, 60), // 상품 이름은 1글자 이상 60글자 이하
  description: s.optional(s.string()), // 상품 설명은 글자들로 이루어진 문자열
  category: s.enums(category), // 상품 카테고리는 이중 하나여야 한다.
  price: s.min(s.number(), 0), // 가격은 0 이상인 숫자
  stock: s.min(s.integer(), 0), // 재고는 0 이상인 정수
});

export const PathProduct = s.partial(CreateProduct); //createproduct에 있는 항목들 중 일부만 바꾸고 싶을 때 사용

export const CreateOrder = s.object({
  userId: Uuid,
  orderItems: s.size(
    s.array(
      s.object({
        productId: Uuid,
        unitPrice: s.min(s.number(), 0),
        quantity: s.min(s.integer(), 1),
      })
    ),
    1,
    Infinity
  ),
});

export const CreateSavedProduct = s.object({
  productId: Uuid,
});
