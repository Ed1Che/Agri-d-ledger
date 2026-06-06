import { expect } from "chai";
import { ethers } from "hardhat";

describe("Counter", function () {
  it("Should emit the Increment event when calling inc()", async function () {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    await expect(counter.inc())
      .to.emit(counter, "Increment")
      .withArgs(1n);
  });

  it("The sum of Increment events should match current value", async function () {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    for (let i = 1n; i <= 10n; i++) {
      await counter.incBy(i);
    }

    const events = await counter.queryFilter(
      counter.filters.Increment()
    );

    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    expect(total).to.equal(await counter.x());
  });
});
