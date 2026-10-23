#!/usr/bin/env python3
"""独立复算 PLAN_stage5.md C.6 的 E1–E4（及“再投资退税不算自己存的钱”的对照）。"""
import json, math

ZVE = 50000          # 工作期 zvE
AV_R, ETF_R = 0.058, 0.06
ABG = 0.26375        # 25 % + Soli
TFS = 0.70           # 1 - Teilfreistellung 30 %
SPB = 1000

def est_soli(x):
    """§32a EStG 2026 + SolZG（Soli 按分舍去）。"""
    x = math.floor(x)
    if x <= 12348: t = 0
    elif x <= 17799: y = (x-12348)/1e4; t = (914.51*y+1400)*y
    elif x <= 69878: z = (x-17799)/1e4; t = (173.10*z+2397)*z+1034.87
    elif x <= 277825: t = 0.42*x-11135.63
    else: t = 0.45*x-19470.38
    t = math.floor(t)
    soli = 0 if t <= 20350 else min(0.055*t, 0.119*(t-20350))
    return t + math.floor(soli*100+1e-9)/100

def run(name, c, mode, N, count_reinvest=True):
    g = min(c, 360)*0.5 + max(0, min(c, 1800)-360)*0.25          # Grundzulage
    s = max(0, est_soli(ZVE) - est_soli(ZVE-(min(c, 1800)+g)) - g)  # §10a 额外好处
    r = min(s, 13680-c) if mode == 'avDepot' else 0
    B = sec = secc = E = 0.0
    for _ in range(N):
        B = B*(1+AV_R) + c + g + r
        E = E*(1+ETF_R) + c
        if mode == 'secondaryDepot':
            sec = sec*(1+ETF_R) + s; secc += s
    RZ, RS = N*g, N*s
    own = N*(c + (r if count_reinvest else 0))
    G = max(0, B - RZ - own)
    T = round(est_soli(ZVE+G) - est_soli(ZVE), 2)
    sec_tax = max(0, (sec-secc)*TFS - SPB)*ABG
    av_net = B - RZ - RS - T + sec - sec_tax
    etf_tax = max(0, (E-N*c)*TFS - SPB)*ABG
    etf_net = E - etf_tax
    diff = av_net - etf_net
    return dict(name=name, mode=mode, savingsRate=c, N=N, countReinvest=count_reinvest,
                s_y=s, zulage_y=g, B=round(B, 2), sec=round(sec, 2), G=round(G, 2),
                T_av=T, avNet=round(av_net, 2), E=round(E, 2), T_etf=round(etf_tax, 2),
                etfNet=round(etf_net, 2), diff=round(diff, 2), relPct=round(diff/av_net*100, 2))

res = [run('E1', 1800, 'avDepot', 10), run('E2', 1800, 'avDepot', 20),
       run('E3', 3600, 'consume', 10), run('E4', 1800, 'secondaryDepot', 10),
       run('E1_cf', 1800, 'avDepot', 10, False), run('E2_cf', 1800, 'avDepot', 20, False)]
expect = {'E1': 139.45, 'E2': -810.43, 'E3': -4383.83, 'E4': 486.95}
lines = []
for x in res:
    ok = '' if x['name'] not in expect else ('  OK' if abs(x['diff']-expect[x['name']]) < 0.005 else '  MISMATCH')
    lines.append(f"{x['name']:6} B={x['B']:.2f} G={x['G']:.2f} T_AV={x['T_av']:.2f} AVnet={x['avNet']:.2f} "
                 f"ETFnet={x['etfNet']:.2f} diff={x['diff']:+.2f} rel={x['relPct']:+.2f}%{ok}")
print("\n".join(lines))
json.dump(res, open('results.json', 'w'), indent=1, ensure_ascii=False)
open('results.txt', 'w').write("\n".join(lines)+"\n")
