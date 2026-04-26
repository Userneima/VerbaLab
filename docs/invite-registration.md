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

## 2. 现在推荐怎么发邀请码

产品里已经有一个最小邀请码管理入口：

- 登录后打开用户菜单
- 进入 `邀请码管理`
- 直接在线上库生成、复制、查看是否已使用

这里显示的是当前线上真实状态，后续发码应优先以这个页面为准，不要再依赖本地清单。

当前只有管理员账号 `wyc1186164839@gmail.com` 能看到和使用这个入口。前端会隐藏入口，Edge Function 也会再次校验，避免其他内测用户直接调用。

## 3. 手工生成邀请码（备用）

插入一批邀请码：

```sql
insert into public.invites (code, note)
values
  ('BETA-001', 'first batch'),
  ('BETA-002', 'first batch'),
  ('BETA-003', 'first batch');
```

即使插入时带空格或小写，触发器也会自动转成大写并去掉首尾空格。

## 4. 查看邀请码使用情况（SQL 备用）

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

## 5. 关闭公开 Signup

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

## 6. Edge Function 部署

修改注册逻辑后，需要重新部署：

```bash
npx supabase functions deploy make-server-1fc434d6 --project-ref ztlrrovudbkmqqjaqhfu
```

## 7. 当前注册链路与旧链路区别

旧链路：

- 任何人都可以在前端注册页输入邮箱密码创建账号

新链路：

- 必须提供有效邀请码
- 邀请码只允许使用一次
- 创建账号和消费邀请码都由服务端完成
- 注册成功后仍然自动登录，不需要再去邮箱确认

## 8. 管理边界

当前这版只做了最小可用管理：

- 生成邀请码
- 查看是否已使用
- 复制可发的邀请码

没有做：

- 批次统计
- 失效时间
- 权限后台
- 已使用邀请码的高级筛选

这样做的目的，是先让线上库重新成为唯一真相源，避免再次出现“本地文档里有码，但线上其实无效”的脱节。
