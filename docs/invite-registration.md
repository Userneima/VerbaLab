# VerbaLab 邀请码注册说明

这版把 VerbaLab 的注册改成了“邀请码注册”，不再保留公开自助注册。

当前链路：

1. 前端注册页提交 `email + password + name + inviteCode`
2. Edge Function `/make-server-1fc434d6/auth/signup` 校验邀请码
3. 服务端创建账号并自动确认邮箱
4. 邀请码成功消费后，前端自动登录进入产品

## 1. 建表 SQL

在 Supabase SQL Editor 里执行：

- [docs/sql/invites.sql](/Users/yuchao/Documents/GitHub/VerbaLab/docs/sql/invites.sql)

表结构：

- `code`：邀请码本体，自动规范化为 `trim + uppercase`
- `used_at`：消费时间
- `used_by`：消费该邀请码的用户 ID
- `note`：备注

安全策略：

- 表在 `public` schema
- 已开启 RLS
- 已撤销 `anon` / `authenticated` 的直接访问权限
- 只有服务端 `service role` 注册逻辑负责消费邀请码

## 2. 手工生成邀请码

插入一批邀请码：

```sql
insert into public.invites (code, note)
values
  ('BETA-001', 'first batch'),
  ('BETA-002', 'first batch'),
  ('BETA-003', 'first batch');
```

即使插入时带空格或小写，触发器也会自动转成大写并去掉首尾空格。

## 3. 查看邀请码使用情况

查看全部邀请码：

```sql
select
  code,
  used_at,
  used_by,
  note,
  created_at
from public.invites
order by created_at desc;
```

只看未使用邀请码：

```sql
select code, note, created_at
from public.invites
where used_at is null
order by created_at desc;
```

只看已使用邀请码：

```sql
select code, used_at, used_by, note
from public.invites
where used_at is not null
order by used_at desc;
```

## 4. 关闭公开 Signup

这一步必须做，否则别人仍然可以绕过前端，直接调用 Supabase Auth 的公开 signup。

在 Supabase Dashboard 中操作：

1. 打开项目 `ztlrrovudbkmqqjaqhfu`
2. 进入 `Authentication`
3. 打开 `Providers`
4. 找到 Email provider
5. 关闭 `Allow new users to sign up`

保留：

- Email / Password 登录

不再允许：

- 公开邮箱密码自助注册

## 5. Edge Function 部署

修改注册逻辑后，需要重新部署：

```bash
npx supabase functions deploy make-server-1fc434d6 --project-ref ztlrrovudbkmqqjaqhfu
```

## 6. 当前注册链路与旧链路区别

旧链路：

- 任何人都可以在前端注册页输入邮箱密码创建账号

新链路：

- 必须提供有效邀请码
- 邀请码只允许使用一次
- 创建账号和消费邀请码都由服务端完成
- 注册成功后仍然自动登录，不需要再去邮箱确认

## 7. 为什么第一版不做邀请码后台

当前目标是小范围内测，优先控制注册入口，不优先做管理界面。

第一版用 SQL 手工维护的好处：

- 改动小
- 风险低
- 权限边界清楚
- 足够支撑少量内测用户

等后面邀请码批量管理、失效时间、批次统计真的变成需求，再补后台更合适。
