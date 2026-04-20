// 普通用户 Token key
const TOKEN_KEY = 'learning_token'

// 管理员 Token key
const ADMIN_TOKEN_KEY = 'admin_token'

// 获取普通用户 Token
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

// 设置普通用户 Token
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

// 移除普通用户 Token
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

// 获取管理员 Token
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

// 设置管理员 Token
export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

// 移除管理员 Token
export function removeAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}