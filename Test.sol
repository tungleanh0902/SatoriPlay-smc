function previewSwapBALtoUSDC(uint256 amount) public view returns (uint256 amountOutDecimal6) {
        (
            IERC20[] memory tokens, 
            uint256[] memory balances, 
            uint256 lastChangeBlock
        ) = IPoolV2(swapRouterV2).getPoolTokens(POOL_ID_V2);
        uint256 balanceTokenInOfBalancer = balances[0];
        uint256 balanceTokenOutOfBalancer = balances[1];

        uint256[] memory scalingFactors = IPoolBALUSDC(balancerBALUSDCPool).getScalingFactors();

        uint256 scalingFactorTokenIn = scalingFactors[1];
        uint256 scalingFactorTokenOut = scalingFactors[2];

        uint256 balanceTokenIn = FixedPoint.divDown(balanceTokenInOfBalancer, scalingFactorTokenIn);
        uint256 balanceTokenOut = FixedPoint.divDown(balanceTokenOutOfBalancer, scalingFactorTokenOut);

        amount = _subtractSwapFeeAmount(amount);

        // All token amounts are upscaled.
        amount = FixedPoint.divDown(amount, scalingFactorTokenIn);

        uint256[] memory normalizedWeight = IPoolBALUSDC(balancerBALUSDCPool).getNormalizedWeights();

        uint256 amountOut = WeightedMath._calcOutGivenIn(
                balanceTokenIn,
                normalizedWeight[1],
                balanceTokenOut,
                normalizedWeight[2],
                amount
            );

        // amountOut tokens are exiting the Pool, so we round down.
        return FixedPoint.divDown(amountOut, scalingFactorTokenOut);
    }

    function _subtractSwapFeeAmount(uint256 amount) internal view returns (uint256) {
        // This returns amount - fee amount, so we round up (favoring a higher fee amount).
        uint256 swapFeePercentage = IPoolBALUSDC(balancerBALUSDCPool).getSwapFeePercentage();

        uint256 feeAmount = amount.mulUp(swapFeePercentage);
        return amount - feeAmount;
    }

    function previewSwapGHOtoUSDC(uint256 amount) public view returns (uint256 amountOutDecimal6) {
        VaultSwapParams memory vaultSwapParams = VaultSwapParams({
            kind: SwapKind.EXACT_IN,
            pool: balancerPool,
            tokenIn: IERC20(wrappedGHO),
            tokenOut: IERC20(wrappedUSDC),
            amountGivenRaw: amount,
            limitRaw: 0,
            userData: ""
        });
        PoolData memory poolData = IVaultExplorer(balancerExplorer).getPoolData(balancerPool);
        SwapState memory swapState = _loadSwapState(vaultSwapParams, poolData);
        PoolSwapParams memory poolSwapParams = _buildPoolSwapParams(vaultSwapParams, swapState, poolData);

        uint256 totalSwapFeeAmountScaled18 = poolSwapParams.amountGivenScaled18.mulUp(swapState.swapFeePercentage);
        poolSwapParams.amountGivenScaled18 -= totalSwapFeeAmountScaled18;

        uint256 amountOut = IPool(balancerPool).onSwap(poolSwapParams);

        amountOutDecimal6 = Math.ceilDiv(amountOut, 1e12);
    }

    function _buildPoolSwapParams(
        VaultSwapParams memory vaultSwapParams,
        SwapState memory swapState,
        PoolData memory poolData
    ) internal view returns (PoolSwapParams memory) {
        return
            PoolSwapParams({
                kind: vaultSwapParams.kind,
                amountGivenScaled18: swapState.amountGivenScaled18,
                balancesScaled18: poolData.balancesLiveScaled18,
                indexIn: swapState.indexIn,
                indexOut: swapState.indexOut,
                router: address(this),
                userData: vaultSwapParams.userData
            });
    }

    function _loadSwapState(
        VaultSwapParams memory vaultSwapParams,
        PoolData memory poolData
    ) internal view returns (SwapState memory swapState) {
        swapState.indexIn = _findTokenIndex(poolData.tokens, vaultSwapParams.tokenIn);
        swapState.indexOut = _findTokenIndex(poolData.tokens, vaultSwapParams.tokenOut);

        swapState.amountGivenScaled18 = _computeAmountGivenScaled18(vaultSwapParams, poolData, swapState);
        swapState.swapFeePercentage = IPool(balancerPool).getStaticSwapFeePercentage();
    }

    function _computeAmountGivenScaled18(
        VaultSwapParams memory vaultSwapParams,
        PoolData memory poolData,
        SwapState memory swapState
    ) internal pure returns (uint256) {
        // If the amountGiven is entering the pool math (ExactIn), round down, since a lower apparent amountIn leads
        // to a lower calculated amountOut, favoring the pool.
        return vaultSwapParams.amountGivenRaw.toScaled18ApplyRateRoundDown(
                    poolData.decimalScalingFactors[swapState.indexIn],
                    poolData.tokenRates[swapState.indexIn]
                );
    }

     function _findTokenIndex(IERC20[] memory tokens, IERC20 token) internal pure returns (uint256) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                return i;
            }
        }

        revert TokenNotRegistered(token);
    }