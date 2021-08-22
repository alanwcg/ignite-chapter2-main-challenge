import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const storageKey = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(storageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get<Stock>(`/stock/${productId}`);

      const stock = response.data;

      const checkProductInCart = cart.find(item => item.id === productId);

      if (checkProductInCart) {
        if (checkProductInCart.amount + 1 > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const products = cart.map(item => {
          if (item.id === productId) {
            const product = item;

            product.amount += 1;

            return product;
          }

          return item;
        });

        setCart(products);
        localStorage.setItem(storageKey, JSON.stringify(products));

        return;

      }

      const res = await api.get(`/products/${productId}`);

      const product = res.data;

      if (product.amount + 1 > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const data = {
        ...product,
        amount: 1,
      };

      const newCart = [...cart, data];

      setCart(newCart);
      localStorage.setItem(storageKey, JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(item => item.id === productId);

      if (!product) {
        throw new Error();
      }

      const updatedCart = cart.filter(item => item.id !== productId);

      setCart(updatedCart);
      localStorage.setItem(storageKey, JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const response = await api.get<Stock>(`/stock/${productId}`);

      const stock = response.data;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(item => {
        if (item.id === productId) {
          const product = item;

          product.amount = amount;

          return product;
        }

        return item;
      });

      setCart(updatedCart);
      localStorage.setItem(storageKey, JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
