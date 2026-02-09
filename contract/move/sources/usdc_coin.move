/// USDC 测试代币模块
/// 任何人可铸造，有数量和冷却时间限制
module prediction_market::usdc_coin {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url;
    use sui::table::{Self, Table};

    /// 错误码：超过单次铸造上限
    const EMintAmountExceeded: u64 = 1;
    /// 错误码：冷却时间未过
    const EMintCooldownNotPassed: u64 = 2;

    /// 单次铸造上限: 10,000 USDC (6位小数)
    const MAX_MINT_AMOUNT: u64 = 10_000_000_000;
    /// 铸造冷却时间: 1小时 (毫秒)
    const MINT_COOLDOWN: u64 = 3_600_000;

    /// USDC 代币类型标识
    public struct USDC_COIN has drop {}

    /// 铸币控制器（共享对象）
    public struct MintController has key {
        id: UID,
        /// TreasuryCap 用于铸币
        treasury_cap: TreasuryCap<USDC_COIN>,
        /// 记录每个地址的上次铸造时间
        last_mint_times: Table<address, u64>,
    }

    /// 模块初始化函数
    fun init(witness: USDC_COIN, ctx: &mut TxContext) {
        // 创建货币
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6, // decimals
            b"USDC",
            b"USD Coin",
            b"Test USDC token for prediction market",
            option::some(url::new_unsafe_from_bytes(b"https://example.com/usdc.png")),
            ctx
        );

        // 冻结元数据，使其不可变
        transfer::public_freeze_object(metadata);

        // 创建铸币控制器并共享
        let controller = MintController {
            id: object::new(ctx),
            treasury_cap,
            last_mint_times: table::new(ctx),
        };
        transfer::share_object(controller);
    }

    /// 铸造代币（有限制）
    /// - amount: 铸造数量（含精度）
    /// - ctx: 交易上下文
    public entry fun mint(
        controller: &mut MintController,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // 检查金额限制
        assert!(amount <= MAX_MINT_AMOUNT, EMintAmountExceeded);

        // 检查冷却时间
        if (table::contains(&controller.last_mint_times, sender)) {
            let last_mint = *table::borrow(&controller.last_mint_times, sender);
            let current_time = tx_context::epoch_timestamp_ms(ctx);
            let time_elapsed = current_time - last_mint;
            assert!(time_elapsed >= MINT_COOLDOWN, EMintCooldownNotPassed);
        };

        // 更新铸造时间
        if (table::contains(&controller.last_mint_times, sender)) {
            let last_mint = table::borrow_mut(&mut controller.last_mint_times, sender);
            *last_mint = tx_context::epoch_timestamp_ms(ctx);
        } else {
            table::add(
                &mut controller.last_mint_times,
                sender,
                tx_context::epoch_timestamp_ms(ctx)
            );
        };

        // 铸造代币并发送给调用者
        let coin = coin::mint(&mut controller.treasury_cap, amount, ctx);
        transfer::public_transfer(coin, sender);
    }

    /// 无限制铸造（用于测试）
    /// - amount: 铸造数量
    /// - recipient: 接收地址
    public entry fun mint_unlimited(
        controller: &mut MintController,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(&mut controller.treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// 查询上次铸造时间
    public fun get_last_mint_time(
        controller: &MintController,
        user: address
    ): u64 {
        if (table::contains(&controller.last_mint_times, user)) {
            *table::borrow(&controller.last_mint_times, user)
        } else {
            0
        }
    }

    /// 获取最大铸造额度
    public fun max_mint_amount(): u64 {
        MAX_MINT_AMOUNT
    }

    /// 获取冷却时间
    public fun mint_cooldown(): u64 {
        MINT_COOLDOWN
    }

    #[test_only]
    /// 测试初始化函数
    public fun test_init(ctx: &mut TxContext) {
        init(USDC_COIN {}, ctx);
    }
}
