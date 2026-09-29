from pathlib import Path
import re

files = [
    Path(r"C:\Users\Irham\Documents\code\metropolis\test\helpers.ts"),
    Path(r"C:\Users\Irham\Documents\code\metropolis\test\HunchVault.ts"),
    Path(r"C:\Users\Irham\Documents\code\metropolis\test\e2e\Hunch.e2e.ts"),
    Path(r"C:\Users\Irham\Documents\code\metropolis\scripts\simulateRound.ts"),
    Path(r"C:\Users\Irham\Documents\code\metropolis\scripts\lib\pythPull.ts"),
    Path(r"C:\Users\Irham\Documents\code\metropolis\test\HunchMath.ts"),
]

for p in files:
    t = p.read_text(encoding="utf-8")
    orig = t
    # typed declarations that receive contracts
    t = re.sub(
        r"const (ausd|pyth|factory|market|vault|feeRecipient|deployer|lp|alice|bob) = await",
        r"const \1: any = await",
        t,
    )
    t = re.sub(
        r"let (market|ausd|pyth|factory|vault) = await",
        r"let \1: any = await",
        t,
    )
    # destructured fixtures
    t = t.replace(
        "const { lp, alice, ausd, pyth, factory, feeRecipient, deployer } = await deployHunchFixture();",
        "const { lp, alice, ausd, pyth, factory, feeRecipient, deployer }: any = await deployHunchFixture();",
    )
    t = t.replace(
        "const { lp, alice, bob, ausd, pyth, factory } = await deployHunchFixture();",
        "const { lp, alice, bob, ausd, pyth, factory }: any = await deployHunchFixture();",
    )
    t = t.replace(
        "const { lp, ausd, pyth, factory } = await deployHunchFixture();",
        "const { lp, ausd, pyth, factory }: any = await deployHunchFixture();",
    )
    t = t.replace(
        "const { market } = await openRound(",
        "const { market }: any = await openRound(",
    )
    # bigint - number in HunchMath
    t = t.replace("spotYes(y, n) - 1", "spotYes(y, n) - 1n")
    if t != orig:
        p.write_text(t, encoding="utf-8")
        print("patched", p.name)
    else:
        print("nochange", p.name)
