import Cookies from "js-cookie";

export const getAccessToken = () => {
  return Cookies.get("access_token");
};

export const saveTokenToStorage = (token: string) => {
  Cookies.set("access_token", token, {
    domain: process.env.NEXT_PUBLIC_DOMAIN,
    sameSite: "strict",
    expires: 1,
  });
};

export const removeTokenFromStorage = () => {
  Cookies.remove("access_token");
};
