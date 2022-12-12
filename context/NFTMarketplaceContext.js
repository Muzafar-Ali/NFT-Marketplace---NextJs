import React, { useContext, useEffect, useState } from 'react'
import web3Modal from 'web3modal'
import { ethers } from 'ethers'
import Router from 'next/router'

//INTERNAL IMPORTS
import { NFTMarketplaceAddress, NFTMarketplaceABI } from './constants'


export const NFTMarketPlaceContext = React.createContext();

export const NFTMarketPlaceProvider = ({children}) =>{
    return(
        <NFTMarketPlaceProvider.Provider value={{}}>
            {children}
        </NFTMarketPlaceProvider.Provider>
    )
}