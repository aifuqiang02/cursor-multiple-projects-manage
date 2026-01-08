/**
 * 统一响应格式工具类
 * 格式: {"code": number, "msg": string, "data": any}
 */
export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
}
export declare const ResponseCode: {
    readonly SUCCESS: 200;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly INTERNAL_ERROR: 500;
};
export declare const ResponseMessage: {
    readonly SUCCESS: "操作成功";
    readonly BAD_REQUEST: "请求参数错误";
    readonly UNAUTHORIZED: "未授权访问";
    readonly FORBIDDEN: "禁止访问";
    readonly NOT_FOUND: "资源不存在";
    readonly INTERNAL_ERROR: "服务器内部错误";
    readonly INVALID_CREDENTIALS: "用户名或密码错误";
    readonly EMAIL_EXISTS: "邮箱已被注册";
    readonly USERNAME_EXISTS: "用户名已被占用";
    readonly USER_NOT_FOUND: "用户不存在";
    readonly PROJECT_NOT_FOUND: "项目不存在";
    readonly TASK_NOT_FOUND: "任务不存在";
    readonly NO_TOKEN: "未提供访问令牌";
    readonly INVALID_TOKEN: "无效的访问令牌";
};
/**
 * 创建成功响应
 * @param data 返回数据
 * @param msg 响应消息，默认为"操作成功"
 * @param code 响应码，默认为200
 */
export declare function success<T = any>(data: T, msg?: string, code?: number): ApiResponse<T>;
/**
 * 创建错误响应
 * @param msg 错误消息
 * @param code 错误码，默认为500
 * @param data 附加数据（可选）
 */
export declare function error<T = any>(msg?: string, code?: number, data?: T): ApiResponse<T | null>;
/**
 * 创建特定错误类型的响应
 */
export declare const ResponseUtil: {
    success: <T = any>(data?: T, msg?: string) => ApiResponse<T | undefined>;
    badRequest: (msg?: string) => ApiResponse<any>;
    unauthorized: (msg?: string) => ApiResponse<any>;
    forbidden: (msg?: string) => ApiResponse<any>;
    notFound: (msg?: string) => ApiResponse<any>;
    internalError: (msg?: string) => ApiResponse<any>;
    invalidCredentials: () => ApiResponse<any>;
    emailExists: () => ApiResponse<any>;
    usernameExists: () => ApiResponse<any>;
    userNotFound: () => ApiResponse<any>;
    projectNotFound: () => ApiResponse<any>;
    taskNotFound: () => ApiResponse<any>;
    noToken: () => ApiResponse<any>;
    invalidToken: () => ApiResponse<any>;
};
//# sourceMappingURL=response.d.ts.map