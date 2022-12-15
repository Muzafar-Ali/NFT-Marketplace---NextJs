import React, { useContext, useEffect, useState } from 'react'
import Web3Modal from 'web3modal'
import { ethers } from 'ethers'
import Router from 'next/router'
import axios from 'axios'
import { create as ipfsHttpClient } from 'ipfs-http-client'

const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

//INTERNAL IMPORTS
import { NFTMarketplaceAddress, NFTMarketplaceABI } from './constants'

//FETCH SMART CONTRACT 
const fetchContract = (signerOrProvider)=> new ethers.Contract(
    NFTMarketplaceAddress,NFTMarketplaceABI,signerOrProvider)

//CONNECTING WITH SMART CONTRACT 
//abstracting the code writing this function to create less code 
const connectingWithSmartContract = async()=>{
    try {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        //create signer, in this case whoever connects to app becomes signer
        const signer = provider.getSigner()
        //create smart contract instance
        const contract = fetchContract(signer);
        return contract
    } catch (error) {
        console.log('something wrong while connecting to smart contract',error)
    }
}

// CREATE CONTEXT
export const NFTMarketplaceContext = React.createContext();
 
export const NFTMarketplaceProvider = ({children}) =>{
    const titleData = "Discover, collect and Sell NFTs"

    //we want to get address of wallet whoever connects/interacts with NFT marketplace
    const [currentAccount, setCurrentAccount] = useState()
    
    //this functions checks wether user is connected to application or not
    const checkIfWalletConnected= async()=>{
        try {
            if(!window.ethereum) return console.log('Pleass Install MetaMask Wallet')
            const accounts = await window.ethereum.request({
                method:"eth_accounts"
            })
            if(accounts.length){
                setCurrentAccount(accounts[0])
            }else{
                console.log("No Account Found")
            }        
        } catch (error) {
            console.log('Something went wrong while connecting wallet',error);
        }
    }
    useEffect(()=>{
        checkIfWalletConnected()
    },[])

    // CONNECT WALLET 
    const connectWallet = async()=>{
        try{    
            if(!window.ethereum) return console.log('Pleass Install MetaMask Wallet')
            const accounts = window.ethereum.request({
                method:"eth_requestAccount"
            })
            setCurrentAccount(accounts[0])
            window.location.reload();
        }catch(error){
            console.log(`Error while connecting Wallet : ${error}`)
        }
    }

    // UPLOAD TO IPFS FUNCTION
    const uploadToIpfs = async(file)=>{
        try{
            const added = await client.add({content: file});
            const url = `https://ipfs.infura.io/ipfs/${added.path}`
            return url
        }catch(error){
            console.log("Error While Uploading to IPFS :", error);
        }
    }

    // CREATE NFT
    const createNFT = async(forminput, fileUrl, router)=>{
        try {
            const {name, description, price} = forminput;
            if(!name || !description || !price || !fileUrl) return console.log("some data is missing")
            const data = JSON.stringify({name, description, image: fileUrl})

            try {
                const added = client.add(data);
                const url = `https://ipfs.infura.io/ipfs/${added.path}`
                await createSales(url, price);
            } catch (error) {
                console.log(error)
            }

        } catch (error) {
            console.log(' While Creating NFT :',error)
        }
    }

    // CREATE SALES FUNCTION
    const createSale =async(url, formInputPrice, isReselleing, id)=>{
        try {
            const price = ethers.utils.parseUnits(formInputPrice,'ether')
            const contract = await connectingWithSmartContract()
            const listingPrice = await contract.getListingPrice();
            const transaction = !isReselleing 
                ? await contract.createToken(url, price, {value: listingPrice.toString()})
                : await contract.reSellToken(url, price, {value: listingPrice.toString()});
            transaction.wait();
        } catch (error) {
            console.log("Error while creatins Sale :",error)
        }
    }

    // FETCH NFTS
    const fetchNFTs = async()=>{
        try {
            const provider = new ethers.providers.JsonRpcProvider();
            const contract = fetchContract(provider);

            const data = await contract.fetchMarketItem();
            //console.log('DATA', data)
            
            const items = await Promise.all(
                data.map(async({tokenId, seller, owner, price:unformattedPrice, })=>{
                    const tokenUri = await contract.tokenURI(tokenId);
                    const {data: {image, name, description},} = await axios.get(tokenUri);
                    const price = ethers.utils.formatUnits(unformattedPrice.toString(),'ether');
                    return {
                        price,
                        tokenId: tokenId.toNumber(),
                        seller,
                        owner,
                        image,
                        name,
                        description,
                        tokenUri
                    };
                })
            );
            return items
        } catch (error) {
            console.log('Error while fetching NFTs',error)
        }
    }

    fetchNFTs()

    return(
        <NFTMarketplaceContext.Provider value={{
            connectWallet,
            uploadToIpfs,
            createNFT,
            fetchNFTs,
            titleData
        }}
        >
            {children}
        </NFTMarketplaceContext.Provider>
    )
}