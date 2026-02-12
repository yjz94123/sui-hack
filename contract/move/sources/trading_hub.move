/// 预测市场订单管理模块
/// 用户可自主下单，仅管理员可结算
module prediction_market::trading_hub {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use prediction_market::usdc_coin::USDC_COIN;

    /// 错误码
    const EInvalidAmount: u64 = 1;
    const EInvalidOutcome: u64 = 2;
    const EOrderNotFound: u64 = 3;
    const EOrderAlreadySettled: u64 = 4;
    const EInsufficientBalance: u64 = 5;
    const EUnauthorized: u64 = 6;
    const EInvalidPrice: u64 = 7;

    /// 结果常量
    const OUTCOME_NO: u8 = 0;
    const OUTCOME_YES: u8 = 1;

    /// 价格精度基数 (basis points)
    const BPS_BASE: u64 = 10000;

    /// 管理员权限凭证
    public struct AdminCap has key, store {
        id: UID,
    }

    /// 订单结构
    public struct Order has store {
        order_id: u64,
        user: address,
        market_id: vector<u8>,
        outcome: u8,
        amount: u64,
        /// 入场价格 (basis points, 例: 6500 = 65%)
        price_bps: u64,
        timestamp: u64,
        settled: bool,
    }

    /// TradingHub 主对象（共享）
    public struct TradingHub has key {
        id: UID,
        /// USDC 资金池
        balance: Balance<USDC_COIN>,
        /// 下一个订单 ID
        next_order_id: u64,
        /// 订单存储: order_id -> Order
        orders: Table<u64, Order>,
        /// 用户订单索引: user -> order_ids
        user_orders: Table<address, vector<u64>>,
        /// 市场订单索引: market_id -> order_ids
        market_orders: Table<vector<u8>, vector<u64>>,
    }

    /// 事件：订单创建
    public struct OrderPlaced has copy, drop {
        order_id: u64,
        user: address,
        market_id: vector<u8>,
        outcome: u8,
        amount: u64,
        price_bps: u64,
    }

    /// 事件：订单结算
    public struct OrderSettled has copy, drop {
        order_id: u64,
        user: address,
        market_id: vector<u8>,
        won: bool,
        payout: u64,
    }

    /// 事件：市场结算
    public struct MarketSettled has copy, drop {
        market_id: vector<u8>,
        winning_outcome: u8,
        total_orders: u64,
    }

    /// 初始化函数
    fun init(ctx: &mut TxContext) {
        // 创建管理员权限
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        // 创建 TradingHub 共享对象
        let hub = TradingHub {
            id: object::new(ctx),
            balance: balance::zero(),
            next_order_id: 1,
            orders: table::new(ctx),
            user_orders: table::new(ctx),
            market_orders: table::new(ctx),
        };
        transfer::share_object(hub);
    }

    /// 内部: 创建订单并更新索引
    fun create_order(
        hub: &mut TradingHub,
        user: address,
        market_id: vector<u8>,
        outcome: u8,
        payment: Coin<USDC_COIN>,
        price_bps: u64,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, EInvalidAmount);
        assert!(outcome <= OUTCOME_YES, EInvalidOutcome);
        assert!(price_bps > 0 && price_bps < BPS_BASE, EInvalidPrice);

        // 将 USDC 存入资金池
        let balance_to_add = coin::into_balance(payment);
        balance::join(&mut hub.balance, balance_to_add);

        // 创建订单
        let order_id = hub.next_order_id;
        hub.next_order_id = order_id + 1;

        let order = Order {
            order_id,
            user,
            market_id: market_id,
            outcome,
            amount,
            price_bps,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
            settled: false,
        };

        table::add(&mut hub.orders, order_id, order);

        // 更新用户订单索引
        if (!table::contains(&hub.user_orders, user)) {
            table::add(&mut hub.user_orders, user, vector::empty());
        };
        let user_order_list = table::borrow_mut(&mut hub.user_orders, user);
        vector::push_back(user_order_list, order_id);

        // 更新市场订单索引
        if (!table::contains(&hub.market_orders, market_id)) {
            table::add(&mut hub.market_orders, market_id, vector::empty());
        };
        let market_order_list = table::borrow_mut(&mut hub.market_orders, market_id);
        vector::push_back(market_order_list, order_id);

        // 触发事件
        event::emit(OrderPlaced {
            order_id,
            user,
            market_id,
            outcome,
            amount,
            price_bps,
        });
    }

    /// 创建订单（仅管理员）
    public entry fun place_order(
        _admin_cap: &AdminCap,
        hub: &mut TradingHub,
        user: address,
        market_id: vector<u8>,
        outcome: u8,
        payment: Coin<USDC_COIN>,
        price_bps: u64,
        ctx: &mut TxContext
    ) {
        create_order(hub, user, market_id, outcome, payment, price_bps, ctx);
    }

    /// 用户自主下单（无需管理员）
    /// - price_bps: 入场价格 (basis points), 前端传入当前市场价格
    public entry fun public_place_order(
        hub: &mut TradingHub,
        market_id: vector<u8>,
        outcome: u8,
        payment: Coin<USDC_COIN>,
        price_bps: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        create_order(hub, sender, market_id, outcome, payment, price_bps, ctx);
    }

    /// 结算单个订单（仅管理员）
    /// 赔付公式: payout = amount * 10000 / price_bps
    /// 例: 100 USDC @ 40% → payout = 100 * 10000 / 4000 = 250 USDC
    public entry fun settle_order(
        _admin_cap: &AdminCap,
        hub: &mut TradingHub,
        order_id: u64,
        won: bool,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&hub.orders, order_id), EOrderNotFound);

        let order = table::borrow_mut(&mut hub.orders, order_id);
        assert!(!order.settled, EOrderAlreadySettled);

        order.settled = true;

        let mut payout = 0u64;
        if (won) {
            // payout = amount * BPS_BASE / price_bps
            payout = order.amount * BPS_BASE / order.price_bps;
            assert!(balance::value(&hub.balance) >= payout, EInsufficientBalance);

            let payout_balance = balance::split(&mut hub.balance, payout);
            let payout_coin = coin::from_balance(payout_balance, ctx);
            transfer::public_transfer(payout_coin, order.user);
        };

        event::emit(OrderSettled {
            order_id,
            user: order.user,
            market_id: order.market_id,
            won,
            payout,
        });
    }

    /// 批量结算市场的所有订单（仅管理员）
    public entry fun settle_market(
        _admin_cap: &AdminCap,
        hub: &mut TradingHub,
        market_id: vector<u8>,
        winning_outcome: u8,
        ctx: &mut TxContext
    ) {
        assert!(winning_outcome <= OUTCOME_YES, EInvalidOutcome);

        if (!table::contains(&hub.market_orders, market_id)) {
            event::emit(MarketSettled {
                market_id,
                winning_outcome,
                total_orders: 0,
            });
            return
        };

        let order_ids = table::borrow(&hub.market_orders, market_id);
        let len = vector::length(order_ids);
        let mut i = 0;

        while (i < len) {
            let order_id = *vector::borrow(order_ids, i);
            let order = table::borrow_mut(&mut hub.orders, order_id);

            if (!order.settled) {
                order.settled = true;
                let won = order.outcome == winning_outcome;

                let mut payout = 0u64;
                if (won) {
                    payout = order.amount * BPS_BASE / order.price_bps;
                    assert!(balance::value(&hub.balance) >= payout, EInsufficientBalance);

                    let payout_balance = balance::split(&mut hub.balance, payout);
                    let payout_coin = coin::from_balance(payout_balance, ctx);
                    transfer::public_transfer(payout_coin, order.user);
                };

                event::emit(OrderSettled {
                    order_id,
                    user: order.user,
                    market_id,
                    won,
                    payout,
                });
            };

            i = i + 1;
        };

        event::emit(MarketSettled {
            market_id,
            winning_outcome,
            total_orders: len,
        });
    }

    /// 管理员存入 USDC（用于支付获胜者）
    public entry fun deposit_usdc(
        _admin_cap: &AdminCap,
        hub: &mut TradingHub,
        payment: Coin<USDC_COIN>,
    ) {
        let balance_to_add = coin::into_balance(payment);
        balance::join(&mut hub.balance, balance_to_add);
    }

    /// 管理员提取 USDC
    public entry fun withdraw_usdc(
        _admin_cap: &AdminCap,
        hub: &mut TradingHub,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&hub.balance) >= amount, EInsufficientBalance);

        let withdraw_balance = balance::split(&mut hub.balance, amount);
        let withdraw_coin = coin::from_balance(withdraw_balance, ctx);
        transfer::public_transfer(withdraw_coin, recipient);
    }

    // ============ 视图函数 ============

    /// 获取订单详情
    public fun get_order(hub: &TradingHub, order_id: u64): &Order {
        assert!(table::contains(&hub.orders, order_id), EOrderNotFound);
        table::borrow(&hub.orders, order_id)
    }

    /// 获取用户的所有订单 ID
    public fun get_user_orders(hub: &TradingHub, user: address): vector<u64> {
        if (table::contains(&hub.user_orders, user)) {
            *table::borrow(&hub.user_orders, user)
        } else {
            vector::empty()
        }
    }

    /// 获取市场的所有订单 ID
    public fun get_market_orders(hub: &TradingHub, market_id: vector<u8>): vector<u64> {
        if (table::contains(&hub.market_orders, market_id)) {
            *table::borrow(&hub.market_orders, market_id)
        } else {
            vector::empty()
        }
    }

    /// 获取订单总数
    public fun total_orders(hub: &TradingHub): u64 {
        hub.next_order_id - 1
    }

    /// 获取合约 USDC 余额
    public fun get_balance(hub: &TradingHub): u64 {
        balance::value(&hub.balance)
    }

    // ============ 订单字段访问器 ============

    public fun order_id(order: &Order): u64 { order.order_id }
    public fun user(order: &Order): address { order.user }
    public fun market_id(order: &Order): vector<u8> { order.market_id }
    public fun outcome(order: &Order): u8 { order.outcome }
    public fun amount(order: &Order): u64 { order.amount }
    public fun price_bps(order: &Order): u64 { order.price_bps }
    public fun timestamp(order: &Order): u64 { order.timestamp }
    public fun settled(order: &Order): bool { order.settled }

    #[test_only]
    /// 测试初始化函数
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }
}
