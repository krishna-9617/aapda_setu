import kagglehub
import os

print('Downloading flood dataset...')
flood_path = kagglehub.dataset_download('naiyakhalid/flood-prediction-dataset')
print(f'Flood dataset path: {flood_path}')
print('Contents:', os.listdir(flood_path))

print('Downloading landslide dataset...')
landslide_path = kagglehub.dataset_download('sreeragunandha/landslide-prediction-dataset')
print(f'Landslide dataset path: {landslide_path}')
print('Contents:', os.listdir(landslide_path))