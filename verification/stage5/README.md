# Stage 5 C.6（E1–E4）独立复算

运行：`python3 verify_stage5.py`（只用标准库）。会打印结果，并写出 `results.json` 和 `results.txt`。

## 输入
- 所得税：§32a EStG 2026 年税表，Grundfreibetrag 12.348；Soli Freigrenze 20.350 / 过渡区 11,9 %（Soli 按分舍去取整）
- 工作期 zvE 50.000（取出那一年也按这个收入算）
- Grundzulage：min(c,360)×50 % + (min(c,1.800)−360)×25 %，c = 1.800 时为 540；没有孩子，没有 starterBonus
- §10a 额外好处：s = max(0, ESt(zvE) − ESt(zvE − (min(c,1.800) + Zulage)) − Zulage)，结果为每年 272
- AV 净收益率 5,8 %（6 % − 费用 0,2 %），ETF 6 %，Basiszins 0（所以 Vorabpauschale = 0）
- ETF 卖出：(收益 × 70 %（Teilfreistellung 30 %）− Sparerpauschbetrag 1.000) × 26,375 %
- 提前取出：退回全部 Zulagen 和 §10a 好处；应税 G = 余额 − Zulagen − 自己存的钱（包括再投资的退税），税按累进差额 ESt(zvE+G) − ESt(zvE) 计算
- 场景（来自 PLAN_stage5.md C.6）：E1 每年 1.800、退税再投资、N=10；E2 同 E1、N=20；E3 每年 3.600、退税花掉、N=10；E4 每年 1.800、副账户模式、N=10
- E1_cf / E2_cf：对照算法，再投资的退税**不算**自己存的钱

## 结果
差额：E1 +139,45，E2 −810,43，E3 −4.383,83，E4 +486,95，与 PLAN 一致。对照算法：E1_cf −903,55，E2_cf −3.367,35。

## E3_b（Q15(b)，PLAN_stage5.md C.2 / 脚注 ¹ / Q15）
- 定义：和 E3 相同（每年 3.600，退税花掉，N=10），但把已拿到并花掉的退税 Σs = 2.720 按**名义值**（不计增长，PLAN 没写要计增长）加进 AV 一侧到手；R_S = 2.720 仍然全额退回。
- 相对差异的分母 = 包含这 2.720 的 AV 一侧到手（43.936,66），和 PLAN 一致。
- 结果：差额 −1.663,83，相对差异 −3,79 %，与 PLAN 一致（OK）。E1–E4 (a) 的结果不变。
