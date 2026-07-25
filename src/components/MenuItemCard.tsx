import React from 'react';
import { Plus } from "lucide-react";
import { MenuItem } from "../types";
import { getLisbonDate } from "../utils/date";
import { findImageForProduct } from "../utils/imageResolver";

interface MenuItemCardProps {
  item: MenuItem & { isMaisPedido?: boolean; groupOverride?: string };
  catId: string;
  failedImage: boolean;
  onImageError: () => void;
  onClick: () => void;
  onZoom: (src: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({

  item,
  catId,
  failedImage,
  onImageError,
  onClick,
  onZoom,
}) => {
  const prices = [];
  if (item.priceM) prices.push(`M €${item.priceM.toFixed(2)}`);
  if (item.priceG) prices.push(`G €${item.priceG.toFixed(2)}`);
  if (item.priceP && !item.priceM && !item.priceG) prices.push(`P €${item.priceP.toFixed(2)}`);

  let priceDisplay: React.ReactNode = null;
  if (prices.length > 2) {
    priceDisplay = (
      <span className="font-medium text-gray-900 text-[15px]">
        A partir de €{(item.priceP || item.priceM || item.priceG || 0).toFixed(2)}
      </span>
    );
  } else if (prices.length > 0) {
    priceDisplay = (
      <span className="font-medium text-gray-900 text-[14px] tracking-tight">
        {prices.join(" · ")}
      </span>
    );
  } else {
    priceDisplay = (
      <span className="font-medium text-gray-900 text-[15px]">
        €{(item.priceSingle || 0).toFixed(2)}
      </span>
    );
  }

  const [imgAttempt, setImgAttempt] = React.useState(0);
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];

  let photoSrc = item.imageUrl ? item.imageUrl.replace(/^\//, '') : "";
  if (photoSrc === 'none') {
    photoSrc = "";
  } else if (!photoSrc) {
    const autoImage = findImageForProduct(item);
    if (autoImage) photoSrc = autoImage.replace(/^\//, '');
  }

  // If it's a dynamic path without http, let's allow it to try extensions
  const getDisplaySrc = () => {
    if (!photoSrc) return "";
    if (photoSrc.startsWith('http')) return imgAttempt > 0 ? '' : photoSrc;
    let base = photoSrc;

    // Remove extension if we are going to try others
    if (imgAttempt > 0) {
      base = base.replace(/\.(png|jpe?g|webp)$/i, '');
      return `/${base}${exts[imgAttempt - 1]}`;
    }
    return `/${base}`;
  };

  const currentSrc = getDisplaySrc();
  const hasPhoto = !!currentSrc && !failedImage;

  if (item.id.startsWith('promo-dia-da-pizza') || catId === 'promocoes') {
    return (
      <div
        onClick={onClick}
        className="w-full h-full flex flex-col overflow-hidden rounded-xl cursor-pointer group shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 bg-white"
      >
        {hasPhoto && (
          <div className="w-full aspect-[4/5] overflow-hidden bg-gray-50 relative flex items-center justify-center">
            <img
              src={currentSrc}
              alt={item.name}
              className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
              onError={() => {
                if (imgAttempt < exts.length) {
                  setImgAttempt(prev => prev + 1);
                } else {
                  onImageError();
                }
              }}
            />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-[16px] text-gray-900 mb-1 leading-tight">
            {item.name}
          </h3>
          <p className="text-[13px] text-gray-500 line-clamp-3 leading-relaxed mb-4">
            {item.ingredients}
          </p>
          <div className="mt-auto flex items-center justify-between">
            <span className="font-extrabold text-gray-900 text-lg">
              €{(item.priceSingle || item.priceM || item.priceG || item.priceP || 0).toFixed(2)}
            </span>
            <span className="text-[#8b0000] font-bold text-sm hover:underline">
              Pedir Agora
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${catId === "promocoes" ? "bg-[#8b0000]/10 border-[#8b0000]" : (catId === "menu-do-dia" && item.dayOfWeek === getLisbonDate().getDay() ? "bg-green-50 border-green-500" : "bg-white border-gray-200")} border rounded-xl p-4 flex items-start justify-between gap-4 cursor-pointer hover:shadow transition-shadow duration-200 group relative bg-white`}
    >
      {catId === "promocoes" && (
        <div className="absolute top-0 right-0 bg-[#8b0000] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider z-10">
          Destaque
        </div>
      )}
      {catId === "menu-do-dia" && item.dayOfWeek === getLisbonDate().getDay() && (
        <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider z-10 shadow-sm animate-pulse">
          🔥 HOJE
        </div>
      )}
      {item.isMaisPedido && catId === "mais-pedidos" && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider z-10">
          🔥 Popular
        </div>
      )}
      <div className={`flex-1 flex flex-col justify-between h-full ${hasPhoto ? "min-h-[112px]" : "min-h-[88px]"}`}>
        <div>
          <h3
            className={`font-bold ${catId === "promocoes" ? "text-lg text-[#8b0000]" : "text-[15px] text-gray-900"} mb-1 break-words pr-2`}
          >
            {item.name}
          </h3>
          <p
            className={`text-[13px] ${catId === "promocoes" ? "text-gray-700 font-medium" : "text-gray-500"} line-clamp-2 leading-relaxed pr-2 mt-1`}
          >
            {item.ingredients}
          </p>
        </div>
        <div className="mt-4 flex justify-between items-center pr-2">
          {priceDisplay}
          <button className="w-7 h-7 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Foto do produto Estilo iFood */}
      {hasPhoto && (
        <div className="w-[112px] h-[112px] shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm relative flex items-center justify-center">
          <img
            src={currentSrc}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(currentSrc);
            }}
            onError={() => {
              if (imgAttempt < exts.length) {
                setImgAttempt(prev => prev + 1);
              } else {
                onImageError();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default MenuItemCard;
