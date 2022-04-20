//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "./IDO.sol";

contract IDOFactory is Ownable {
    uint256 public totalIdos;
    address[] public allIdos;

    address public feeAddress;
    event IdoCreated(address ido, string uri, uint256 index);
    event onFeeAddressChanged(address _feeAddress);

    constructor(address _feeAddress) {
        feeAddress = _feeAddress;
    }

    function changeFeeAddress(address _feeAddress) public onlyOwner {
        require(_feeAddress != address(0), "invalid address");
        feeAddress = _feeAddress;
        emit onFeeAddressChanged(feeAddress);
    }

    function createIDO(
        string memory _uri,
        address _tokenAddress,
        uint256 _tradeValue,
        uint256 _tokensForSale,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _individualMinimumAmount,
        uint256 _individualMaximumAmount,
        bool _isTokenSwapAtomic,
        uint256 _minimumRaise,
        uint256 _feeAmount,
        bool _hasWhitelisting
    ) public onlyOwner {
        IDO _ido = new IDO(
            _tokenAddress,
            _tradeValue,
            _tokensForSale,
            _startDate,
            _endDate,
            _individualMinimumAmount,
            _individualMaximumAmount,
            _isTokenSwapAtomic,
            _minimumRaise,
            _feeAmount,
            _hasWhitelisting,
            feeAddress
        );

        _ido.setTokenURI(_uri);
        _ido.transferOwnership(msg.sender);
        emit IdoCreated(address(_ido), _uri, totalIdos);
        totalIdos = totalIdos + 1;
        allIdos.push(address(_ido));
    }
}
