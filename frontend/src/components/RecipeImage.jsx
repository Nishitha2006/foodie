import { useState } from 'react';
import { imageSrc } from '../services/api';
import Icon from './Icon';

// Shows the recipe photo, or a friendly placeholder when there is none
// or the image fails to load.
export default function RecipeImage({ src, alt }) {
  const url = imageSrc(src);
  const [failedUrl, setFailedUrl] = useState(null);

  if (!url || failedUrl === url) {
    return (
      <div className="image-placeholder" role="img" aria-label={alt}>
        <Icon name="chef" size={44} />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailedUrl(url)} />;
}
