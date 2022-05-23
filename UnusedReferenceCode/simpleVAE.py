import numpy as np
from numpy import ones
from numpy import zeros
from numpy.random import random
from numpy.random import randn
from numpy import vstack
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.optimizers import Adam

#from keras.layers import Conv
import glob
import json
import os
import pandas as pd
from matplotlib import pyplot
from matplotlib import axes

# Get a list of the files in the directory and read them all into a numpy array
def readData():
    files = glob.glob('./training/*.json')
    pathsList = []
    for file in files:
        path = pd.read_json(file)
        path.drop(['Percent Padded','MMSI'], axis= 1, inplace= True)
        singlePath = path.values.squeeze().tolist()
        pathsList.append(singlePath)
        break
        

    pathsArray = np.array(pathsList)
    print(pathsArray)
    return pathsArray



def BuildModel(pathShape, latentDims):
    model = keras.Sequential()
    encoder = keras.Sequential([
        layers.Flatten(),
        #layers.BatchNormalization(),
        layers.Dense(latentDims * 8, activation='LeakyReLU', kernel_initializer='he_uniform'),
        layers.LeakyReLU(alpha=0.3),
        layers.Dense(latentDims * 4),
        layers.LeakyReLU(alpha=0.3),
        layers.Dense(latentDims * 2),
        layers.LeakyReLU(alpha=0.3),
        layers.Dense(latentDims),
        layers.LeakyReLU(alpha=0.3),
    ])

    decoder = keras.Sequential([
        layers.Dense(latentDims * 2),
        layers.LeakyReLU(alpha=0.3),
        layers.Dense(latentDims * 4),
        layers.LeakyReLU(alpha=0.3),
        layers.Dense(latentDims * 8),
        layers.LeakyReLU(alpha=0.3),
        layers.Dense(np.product(pathShape)),
        layers.Reshape(pathShape),
    ])
    model.add(layers.InputLayer(input_shape=pathShape))
    model.add(encoder)
    model.add(decoder)
    opt = Adam(lr=0.000003, beta_1=0.2)
    model.compile(optimizer='adam', loss=keras.losses.MeanSquaredError())
    model.summary()
    return model, encoder, decoder

def TrainModel(model, train_data, epochs):
    # Set up model saving checkpoint
    saveFreq = int(epochs/100)
    modelCheckpoint = tf.keras.callbacks.ModelCheckpoint(filepath='./models/', save_weights_only=True, save_freq=saveFreq, monitor='loss', mode='min', save_best_only=True)
    # Train model
    model.fit(train_data, train_data, epochs=epochs, callbacks=[modelCheckpoint], shuffle=True, batch_size=1)

    # Saved model can be loaded with model.load_weights(filepath)


# Function to clear any old json files from the output folder
def clearJsons():
    '''Deletes all JSON files in ./generated/ folder'''

    print('Clearning JSON files in generated file.')
    removed = 0
    for file in glob.glob('.\\generated\\*'):
        #for file in glob.glob('%s\\*.json' %folder):
        os.remove(file) 
        removed = removed + 1
    print('Removed: %d files.' % removed)

# Scales normalized values back to their original range
def scaleVal(val, start, end):
    #print(val)
    scaled = ((val - (-1)) / (1 - (-1)) * (end - start) + start)
    #print(scaled)
    return scaled

# Output paths to json
def outputPaths(paths, epochNumber, batchNumber):
    for pathNum, path in enumerate(paths):

        dfPath = pd.DataFrame(path, columns=['BaseDateTime', 'LAT', 'LON', 'SOG', 'COG', 'Heading'])
        #dfPath['LAT'] = dfPath['LAT'].apply(scaleVal, args=(-90,90))
        #dfPath['LON'] = dfPath['LON'].apply(scaleVal, args=(-180,80))
        #dfPath['Heading'] = dfPath['Heading'].apply(scaleVal, args=(0, 359))
        dfPath.reset_index(drop=True, inplace=True)
        MMSI = str(pathNum)

        pathStr = dfPath.to_json(orient = 'values', indent = 4)

        pathObj = { 'MMSI' : MMSI, 'PathData' : json.loads(pathStr)}

        with open('./generated/path%d.json' % pathNum,'w') as file:
                json.dump(pathObj, file, indent=4)

tf.keras.backend.set_floatx('float64')

data = readData()
epochs = 600
# Shape of each path
dataShape = data[0].shape
model, encoder, decoder = BuildModel(pathShape=dataShape, latentDims=100)
TrainModel(model=model, train_data=data, epochs=epochs)

clearJsons()

outputPaths(model(data[0:1]).numpy(), epochs, 1)

print('done')